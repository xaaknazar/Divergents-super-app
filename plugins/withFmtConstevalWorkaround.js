const { withPodfile } = require('@expo/config-plugins');

// fmt 11.0.2 overwrites FMT_USE_CONSTEVAL even when supplied via -D.
// Patch the installed header so every consumer uses the same definition.
// https://github.com/fmtlib/fmt/issues/4740
const headerBlock = `  # Divergents: fmt Apple clang 21 compatibility.
  fmt_header = installer.sandbox.root.join('fmt/include/fmt/base.h')
  if File.exist?(fmt_header)
    contents = File.read(fmt_header)
    old_condition = '#elif defined(__apple_build_version__) && __apple_build_version__ < 14000029L'
    new_condition = '#elif defined(__apple_build_version__) && (__apple_build_version__ < 14000029L || FMT_CLANG_VERSION >= 2100)'
    if contents.include?(old_condition)
      File.chmod(0644, fmt_header)
      File.write(fmt_header, contents.sub(old_condition, new_condition))
    elsif contents.include?('#define FMT_VERSION 110002') && !contents.include?(new_condition)
      raise 'Не удалось применить исправление fmt для Apple clang 21'
    end
  end
`;

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
    let contents = podfileConfig.modResults.contents;
    const anchor = 'post_install do |installer|\n';
    if (!contents.includes(anchor)) throw new Error('Не найден блок post_install в ios/Podfile');
    if (!contents.includes('FMT_USE_CONSTEVAL=0')) contents = contents.replace(anchor, `${anchor}${block}`);
    if (!contents.includes('# Divergents: fmt Apple clang 21 compatibility.')) {
      contents = contents.replace(anchor, `${anchor}${headerBlock}`);
    }
    podfileConfig.modResults.contents = contents;
    return podfileConfig;
  });
};
