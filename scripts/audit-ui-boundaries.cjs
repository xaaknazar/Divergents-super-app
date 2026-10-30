// Read-only inventory. No grandfathered exceptions: --check fails until all
// reported screen styles and missing component stories have been addressed.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
const reports = [];
for (const file of files('src/screens').filter(file => /\.tsx$/.test(file) && !file.includes('__tests__'))) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const issues = [];
  function visit(node) {
    if (ts.isJsxAttribute(node) && /^(style|className|contentContainerStyle|textStyle|containerStyle|color|bg|backgroundColor|iconSize|valueColor)$/.test(node.name.getText(ast))) {
      issues.push({ line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1,
        reason: 'Screen owns styling or passes a visual override', prop: node.name.getText(ast) });
    }
    // Named local components must not be declared in screens. Hooks and data
    // helpers remain in place; render callbacks are caught by styling above.
    const name = (ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) ? node.name?.getText(ast) : undefined;
    if (name && /^[A-Z]/.test(name) && !/Screen$/.test(name)) {
      const body = ts.isFunctionDeclaration(node) ? node.body : node.initializer;
      if (body && /(?:return\s*\(?\s*<|=>\s*\(?\s*<)/.test(body.getText(ast))) {
        issues.push({ line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1,
          reason: 'Local screen component belongs in components/', component: name });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  reports.push({ file, issues });
}
const componentFiles = files('src/components').filter(file => {
  if (!/\.tsx$/.test(file) || /\.stories\.tsx$|__tests__/.test(file)) return false;
  // Re-export barrels are not components and do not need duplicate stories.
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let hasJsx = false;
  function visit(node) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) hasJsx = true;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return hasJsx;
});
const missingStories = componentFiles.filter(file => !fs.existsSync(file.replace(/\.tsx$/, '.stories.tsx')));
const result = {
  screenFiles: reports.length,
  cleanScreenFiles: reports.filter(report => report.issues.length === 0).map(report => report.file),
  remainingScreenIssues: reports.reduce((sum, report) => sum + report.issues.length, 0),
  componentFiles: componentFiles.length,
  componentFilesWithStories: componentFiles.length - missingStories.length,
  missingStories,
  screens: reports.filter(report => report.issues.length),
  note: 'Static inventory, not a proof of visual equivalence. Native widgets and content colors require semantic review, not blind deletion.',
};
if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`Screens: ${result.screenFiles}; clean: ${result.cleanScreenFiles.length}; remaining issues: ${result.remainingScreenIssues}`);
  console.log(`Component files with stories: ${result.componentFilesWithStories}/${result.componentFiles}`);
  for (const report of result.screens) console.log(`${report.file}: ${report.issues.length}`);
  console.log('Missing stories:\n' + missingStories.join('\n'));
}
if (process.argv.includes('--check') && (result.remainingScreenIssues || missingStories.length)) process.exitCode = 1;
