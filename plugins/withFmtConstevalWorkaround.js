const { withPodfile } = require('@expo/config-plugins');

const block = `  # Xcode 26 workaround for fmt 11 compile-time format checks.
  installer.pods_project.targets.each do |target|
    next unless target.name == 'fmt'
    target.build_configurations.each do |build_config|
      definitions = build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
      definitions = [definitions] unless definitions.is_a?(Array)
      definitions << 'FMT_USE_CONSTEVAL=0' unless definitions.include?('FMT_USE_CONSTEVAL=0')
      build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = definitions
    end
  end
`;

module.exports = function withFmtConstevalWorkaround(config) {
  return withPodfile(config, (podfileConfig) => {
    const contents = podfileConfig.modResults.contents;
    if (contents.includes('FMT_USE_CONSTEVAL=0')) return podfileConfig;
    const anchor = 'post_install do |installer|\n';
    if (!contents.includes(anchor)) throw new Error('Не найден блок post_install в ios/Podfile');
    podfileConfig.modResults.contents = contents.replace(anchor, `${anchor}${block}`);
    return podfileConfig;
  });
};
