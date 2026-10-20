// Mechanical cleanup after extracting a component or retiring a semantic prop.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const walk = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
const files = walk('src').filter(f => /\.tsx?$/.test(f));
for (const file of files) {
  const source = fs.readFileSync(file,'utf8');
  const sf = ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const edits=[];
  const visit = n => {
    if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && n.tagName.getText(sf) === 'ListRow') {
      for(const a of n.attributes.properties) if (ts.isJsxAttribute(a) && a.name.getText(sf)==='last') edits.push({start:a.getFullStart(),end:a.end,text:''});
    }
    ts.forEachChild(n,visit);
  };
  visit(sf);
  if(edits.length) {
    let result=source;
    for(const e of edits.sort((a,b)=>b.start-a.start)) result=result.slice(0,e.start)+e.text+result.slice(e.end);
    fs.writeFileSync(file,result);
  }
}
// Organize only the files involved in this presentation-layer extraction.
const targets = files.filter(f => f.startsWith('src/components/') || f.startsWith('src/storybook/'))
  .concat(['src/navigation/TabBar.tsx','src/screens/community/CommunityHomeScreen.tsx','src/screens/ai/AIChatScreen.tsx','src/screens/profile/ProfileHomeScreen.tsx']);
const config=ts.readConfigFile('tsconfig.json',ts.sys.readFile);
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,process.cwd());
const service=ts.createLanguageService({
  getScriptFileNames:()=>parsed.fileNames, getScriptVersion:()=> '0',
  getScriptSnapshot:f=>fs.existsSync(f)?ts.ScriptSnapshot.fromString(fs.readFileSync(f,'utf8')):undefined,
  getCurrentDirectory:()=>process.cwd(), getCompilationSettings:()=>parsed.options,
  getDefaultLibFileName:opts=>ts.getDefaultLibFilePath(opts), fileExists:ts.sys.fileExists, readFile:ts.sys.readFile, readDirectory:ts.sys.readDirectory,
});
for(const file of targets) {
  const changes=service.organizeImports({type:'file',fileName:path.resolve(file)}, {}, {});
  for(const change of changes) {
    let source=fs.readFileSync(change.fileName,'utf8');
    for(const edit of change.textChanges.sort((a,b)=>b.span.start-a.span.start)) source=source.slice(0,edit.span.start)+edit.newText+source.slice(edit.span.start+edit.span.length);
    fs.writeFileSync(change.fileName,source);
  }
}
