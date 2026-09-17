jest.mock('@expo/config-plugins', () => ({
  withPodfile: (_config, action) => action,
}));

const withFmtConstevalWorkaround = require('../withFmtConstevalWorkaround');

function apply(contents) {
  return withFmtConstevalWorkaround({})({ modResults: { contents } }).modResults.contents;
}

test('adds header workaround and preserves the existing post-install hook', () => {
  const result = apply('post_install do |installer|\n  react_native_post_install(installer)\nend\n');
  expect(result).toContain('fmt/include/fmt/base.h');
  expect(result).toContain('FMT_CLANG_VERSION >= 2100');
  expect(result).toContain('react_native_post_install(installer)');
  expect(apply(result)).toBe(result);
});

test('upgrades Podfiles that already contain the old compiler flag workaround', () => {
  const result = apply("post_install do |installer|\n  # FMT_USE_CONSTEVAL=0\nend\n");
  expect(result).toContain('File.write(fmt_header');
  expect(result.match(/FMT_USE_CONSTEVAL=0/g)).toHaveLength(1);
  expect(apply(result)).toBe(result);
});

test('fails clearly if the Expo Podfile layout changes', () => {
  expect(() => apply('target "Divergents" do\nend\n')).toThrow('post_install');
});
