Pod::Spec.new do |s|
  s.name = 'CoursePurchases'
  s.version = '1.0.0'
  s.summary = 'Divergents StoreKit 2 course purchases'
  s.description = s.summary
  s.license = { :type => 'Proprietary' }
  s.author = 'Divergents'
  s.homepage = 'https://divergents-lms.kz'
  s.source = { :git => 'https://github.com/xaaknazar/Divergents-super-app' }
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '*.swift'
end
