const { withInfoPlist, withEntitlementsPlist, withXcodeProject, withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const plist = require('@expo/plist').default;
const GROUP = 'group.kz.divergents.reading';

/** Opt-in native pilot. Production must not gain unapproved entitlements implicitly. */
module.exports = function withReadingFocus(config, options = {}) {
  if (!options.enabled) return config;
  config = withAndroidManifest(config, c => {
    const manifest = c.modResults.manifest;
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults);
    const permissionNames = ['android.permission.FOREGROUND_SERVICE', 'android.permission.FOREGROUND_SERVICE_SPECIAL_USE', 'android.permission.POST_NOTIFICATIONS'];
    manifest['uses-permission'] = manifest['uses-permission'] || [];
    for (const name of permissionNames) if (!manifest['uses-permission'].some(p => p.$['android:name'] === name)) manifest['uses-permission'].push({ $: { 'android:name': name } });
    app['meta-data'] = (app['meta-data'] || []).filter(m => m.$['android:name'] !== 'DivergentsReadingFocusPilot');
    app['meta-data'].push({ $: { 'android:name': 'DivergentsReadingFocusPilot', 'android:value': 'true' } });
    app.service = (app.service || []).filter(s => !s.$['android:name'].startsWith('kz.divergents.reading.'));
    app.service.push({ $: { 'android:name': 'kz.divergents.reading.ReadingBlockService', 'android:exported': 'true',
      'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE', 'android:label': '@string/reading_focus_label' },
      'intent-filter': [{ action: [{ $: { 'android:name': 'android.accessibilityservice.AccessibilityService' } }] }],
      'meta-data': [{ $: { 'android:name': 'android.accessibilityservice', 'android:resource': '@xml/reading_accessibility' } }],
    });
    app.service.push({ $: { 'android:name': 'kz.divergents.reading.ReadingTimerService', 'android:exported': 'false', 'android:foregroundServiceType': 'specialUse' },
      property: [{ $: { 'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE', 'android:value': 'User-started reading focus countdown and overtime stopwatch with a pause action; ends at the challenge day boundary.' } }],
    });
    app.activity = (app.activity || []).filter(a => a.$['android:name'] !== 'kz.divergents.reading.ReadingShieldActivity');
    app.activity.push({ $: { 'android:name': 'kz.divergents.reading.ReadingShieldActivity', 'android:exported': 'false',
      'android:excludeFromRecents': 'true', 'android:launchMode': 'singleTop', 'android:theme': '@android:style/Theme.Material.Light.NoActionBar' } });
    return c;
  });
  const bundle = config.ios?.bundleIdentifier || 'kz.divergents.app';
  const targets = ['ReadingFocusMonitor', 'ReadingFocusWidget'];
  config.extra = { ...config.extra, eas: { ...config.extra?.eas, build: { ...config.extra?.eas?.build,
    experimental: { ios: { appExtensions: targets.map(targetName => ({ targetName,
      bundleIdentifier: `${bundle}.${targetName}`, entitlements: {
        'com.apple.security.application-groups': [GROUP], 'com.apple.developer.family-controls': true,
      } })) } },
  } } };
  config = withInfoPlist(config, c => {
    c.modResults.DivergentsReadingFocusPilot = true;
    c.modResults.NSSupportsLiveActivities = true;
    return c;
  });
  config = withEntitlementsPlist(config, c => {
    c.modResults['com.apple.developer.family-controls'] = true;
    // App Attest (offline reading starts). Opt-in: the App ID must have the App Attest capability
    // in the Apple Developer portal first, otherwise signing fails (capability sync is disabled).
    if (options.appAttest) c.modResults['com.apple.developer.devicecheck.appattest-environment'] = 'production';
    c.modResults['com.apple.security.application-groups'] = [...new Set([...(c.modResults['com.apple.security.application-groups'] || []), GROUP])];
    return c;
  });
  return withXcodeProject(config, c => {
    const project = c.modResults;
    const root = c.modRequest.projectRoot;
    for (const name of targets) {
      const folder = path.join(c.modRequest.platformProjectRoot, name);
      fs.mkdirSync(folder, { recursive: true });
      fs.copyFileSync(path.join(root, 'modules/reading-focus/ios/ReadingFocusStore.swift'), path.join(folder, 'ReadingFocusStore.swift'));
      fs.copyFileSync(path.join(root, 'modules/reading-focus/ios/ReadingBootMarker.h'), path.join(folder, 'ReadingBootMarker.h'));
      fs.copyFileSync(path.join(root, 'modules/reading-focus/ios/PrivacyInfo.xcprivacy'), path.join(folder, 'PrivacyInfo.xcprivacy'));
      fs.copyFileSync(path.join(root, `modules/reading-focus/extensions/${name}.swift`), path.join(folder, `${name}.swift`));
      const entitlement = { 'com.apple.security.application-groups': [GROUP], 'com.apple.developer.family-controls': true };
      fs.writeFileSync(path.join(folder, `${name}.entitlements`), plist.build(entitlement));
      const extension = name === 'ReadingFocusMonitor'
        ? { NSExtensionPointIdentifier: 'com.apple.deviceactivity.monitor-extension', NSExtensionPrincipalClass: '$(PRODUCT_MODULE_NAME).ReadingFocusMonitor' }
        : { NSExtensionPointIdentifier: 'com.apple.widgetkit-extension' };
      fs.writeFileSync(path.join(folder, `${name}-Info.plist`), plist.build({
        CFBundleDisplayName: name === 'ReadingFocusMonitor' ? 'Чтение' : 'Таймер чтения',
        CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)', CFBundleExecutable: '$(EXECUTABLE_NAME)',
        CFBundleName: '$(PRODUCT_NAME)', CFBundlePackageType: 'XPC!', CFBundleVersion: config.ios.buildNumber,
        CFBundleShortVersionString: config.version, NSExtension: extension, DivergentsReadingFocusPilot: true,
      }));
      const existing = Object.entries(project.pbxNativeTargetSection()).find(([, t]) => t && typeof t === 'object' && String(t.name).replace(/"/g, '') === name);
      const target = existing ? { uuid: existing[0], pbxNativeTarget: existing[1] }
        : project.addTarget(name, 'app_extension', name, `${bundle}.${name}`);
      if (!existing) {
        project.addBuildPhase([`${name}/ReadingFocusStore.swift`, `${name}/${name}.swift`], 'PBXSourcesBuildPhase', 'Sources', target.uuid);
        project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);
        project.addBuildPhase([`${name}/PrivacyInfo.xcprivacy`], 'PBXResourcesBuildPhase', 'Resources', target.uuid);
      }
      const list = project.pbxXCConfigurationList()[target.pbxNativeTarget.buildConfigurationList];
      for (const ref of list.buildConfigurations) {
        Object.assign(project.pbxXCBuildConfigurationSection()[ref.value].buildSettings, {
          SWIFT_VERSION: '5.9', IPHONEOS_DEPLOYMENT_TARGET: '16.2', TARGETED_DEVICE_FAMILY: '1',
          CODE_SIGN_ENTITLEMENTS: `"${name}/${name}.entitlements"`, APPLICATION_EXTENSION_API_ONLY: 'YES',
          GENERATE_INFOPLIST_FILE: 'NO', CODE_SIGN_STYLE: 'Automatic',
          SWIFT_OBJC_BRIDGING_HEADER: `"${name}/ReadingBootMarker.h"`,
        });
      }
    }
    return c;
  });
};
