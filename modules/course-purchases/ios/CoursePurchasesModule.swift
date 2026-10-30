import ExpoModulesCore
import StoreKit

// StoreKit is the durable outbox. A transaction is NEVER finished here until
// the authenticated server has verified it and committed the course access.
@available(iOS 15.0, *)
private actor CourseStore {
  static let shared = CourseStore()
  private var purchasing = false
  private var transactions: [UInt64: StoreKit.Transaction] = [:]
  private var proofs: [UInt64: [String: String]] = [:]

  func remember(_ result: VerificationResult<StoreKit.Transaction>) -> [String: String]? {
    guard case .verified(let transaction) = result,
      transaction.productType == .nonConsumable,
      transaction.productID.hasPrefix("kz.divergents.course."),
      let accountToken = transaction.appAccountToken else { return nil }
    // The signed environment is checked again by the server. Do not infer it
    // from TestFlight or a mutable build flag.
    let parts = result.jwsRepresentation.split(separator: ".")
    guard parts.count == 3 else { return nil }
    var base64 = String(parts[1]).replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
    base64 += String(repeating: "=", count: (4 - base64.count % 4) % 4)
    guard let data = Data(base64Encoded: base64),
      let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
      let environment = payload["environment"] as? String,
      ["Production", "Sandbox"].contains(environment) else { return nil }
    transactions[transaction.id] = transaction
    let proof = ["transactionId": String(transaction.id), "productId": transaction.productID,
      "appAccountToken": accountToken.uuidString.lowercased(), "environment": environment]
    proofs[transaction.id] = proof
    return proof
  }

  func purchase(_ productID: String, accountToken: String) async throws -> [String: Any] {
    guard !purchasing else { throw CoursePurchaseFailure.busy }
    guard productID.hasPrefix("kz.divergents.course."), let token = UUID(uuidString: accountToken) else {
      throw CoursePurchaseFailure.invalidProduct
    }
    purchasing = true
    defer { purchasing = false }
    guard let product = try await Product.products(for: [productID]).first,
      product.type == .nonConsumable else { throw CoursePurchaseFailure.invalidProduct }
    switch try await product.purchase(options: [.appAccountToken(token)]) {
    case .success(let result):
      guard let verified = remember(result) else { throw CoursePurchaseFailure.unverified }
      return ["status": "purchased", "transaction": verified]
    case .pending: return ["status": "pending"]
    case .userCancelled: return ["status": "cancelled"]
    @unknown default: throw CoursePurchaseFailure.unverified
    }
  }

  func pending(accountToken: String, restore: Bool) async throws -> [[String: String]] {
    guard UUID(uuidString: accountToken) != nil else { throw CoursePurchaseFailure.invalidAccount }
    if restore { try await AppStore.sync() }
    var results: [String: [String: String]] = [:]
    for await item in StoreKit.Transaction.unfinished {
      if let value = remember(item), value["appAccountToken"] == accountToken.lowercased() {
        results[value["transactionId"]!] = value
      }
    }
    // Also recover confirmed purchases when reinstalling / signing into a
    // second device. Another Divergents account can never claim these.
    if restore {
      for await item in StoreKit.Transaction.currentEntitlements {
        if let value = remember(item), value["appAccountToken"] == accountToken.lowercased() {
          results[value["transactionId"]!] = value
        }
      }
    }
    // Refund/revocation updates can refer to transactions already finished.
    // Keep these events until the server acknowledges their current state too.
    for value in proofs.values where value["appAccountToken"] == accountToken.lowercased() {
      results[value["transactionId"]!] = value
    }
    return Array(results.values)
  }

  func finish(_ id: String, accountToken: String) async throws {
    guard let number = UInt64(id), let transaction = transactions[number],
      transaction.appAccountToken?.uuidString.lowercased() == accountToken.lowercased() else {
      throw CoursePurchaseFailure.invalidAccount
    }
    await transaction.finish()
    transactions.removeValue(forKey: number)
    proofs.removeValue(forKey: number)
  }
}

private enum CoursePurchaseFailure: Error {
  case busy, invalidProduct, unverified, invalidAccount
}

public class CoursePurchasesModule: Module {
  private var updates: Task<Void, Never>?
  public func definition() -> ModuleDefinition {
    Name("CoursePurchases")
    Events("transactionAvailable")
    OnCreate { [weak self] in
      self?.updates = Task { [weak self] in
        for await update in StoreKit.Transaction.updates {
          guard !Task.isCancelled else { return }
          if await CourseStore.shared.remember(update) != nil {
            self?.sendEvent("transactionAvailable", [:])
          }
        }
      }
    }
    OnDestroy { [weak self] in self?.updates?.cancel(); self?.updates = nil }
    AsyncFunction("products") { (ids: [String]) async throws -> [[String: String]] in
      guard ids.count <= 100, ids.allSatisfy({ $0.hasPrefix("kz.divergents.course.") }) else {
        throw CoursePurchaseFailure.invalidProduct
      }
      return try await Product.products(for: ids).filter { $0.type == .nonConsumable }.map {
        ["id": $0.id, "title": $0.displayName, "displayPrice": $0.displayPrice]
      }
    }
    AsyncFunction("purchase") { (productID: String, token: String) async throws -> [String: Any] in
      try await CourseStore.shared.purchase(productID, accountToken: token)
    }
    AsyncFunction("pending") { (token: String, restore: Bool) async throws -> [[String: String]] in
      try await CourseStore.shared.pending(accountToken: token, restore: restore)
    }
    AsyncFunction("finish") { (transactionID: String, token: String) async throws in
      try await CourseStore.shared.finish(transactionID, accountToken: token)
    }
  }
}
