import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { auditHtml } from '../../qa/lib/a11y.mjs';
import { checkDist } from '../../scripts/check-accessibility.mjs';

const doc = (body, { lang = 'lang="en"', main = true } = {}) =>
  `<!doctype html><html ${lang}><head><title>t</title></head><body>${main ? '<main>' : ''}${body}${main ? '</main>' : ''}</body></html>`;
const good = doc('<h1>Heading</h1>');
const codes = (html) => auditHtml(html).map((f) => f.code);

test('hidden tracking iframe (GTM noscript style) is not flagged', () => {
  assert.deepEqual(auditHtml(doc('<h1>H</h1><noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-X" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>')), []);
});

test('healthy page has no findings', () => {
  assert.deepEqual(auditHtml(good), []);
  assert.deepEqual(auditHtml(doc(
    '<h1>H</h1><a href="#s">Skip</a><section id="s"></section><a href="/x/"><img src="/a.png" alt="Logo"></a>' +
    '<img src="/d.png" alt=""><label for="n">Name</label><input id="n" name="n"><label>Mail <input name="m"></label>' +
    '<textarea id="t" aria-label="Msg"></textarea><input type="hidden" name="h"><button type="submit">Send</button>' +
    '<iframe title="Map" src="/m/"></iframe><p id="d">d</p><input id="q" aria-describedby="d" title="q">')), []);
});

test('redundant role=main on the single main is one landmark; visible text beside aria-hidden still names', () => {
  assert.deepEqual(auditHtml(doc('<h1>H</h1>', { main: false }).replace('<body>', '<body><main role="main"><h1>H</h1></main>').replace(/<h1>H<\/h1><\/body>/, '</body>')), []);
  assert.deepEqual(auditHtml(doc('<h1>H</h1><button type="button"><span aria-hidden="true">x</span> Close</button><a href="/x/"><span aria-hidden="true"><span>i</span></span>Home</a>')), []);
  assert.deepEqual(auditHtml(doc('<h1>H</h1><label><input type="radio" name="r"> A</label><label><input type="radio" name="r"> B</label>')), []);
});

const detects = [
  ['missing lang', doc('<h1>H</h1>', { lang: '' }), 'html-lang'],
  ['empty lang', doc('<h1>H</h1>', { lang: 'lang=""' }), 'html-lang'],
  ['missing main', doc('<h1>H</h1>', { main: false }), 'main-landmark'],
  ['two mains', doc('<h1>H</h1><main></main>'), 'main-landmark'],
  ['missing h1', doc('<p>x</p>'), 'h1-count'],
  ['two h1', doc('<h1>A</h1><h1>B</h1>'), 'h1-count'],
  ['empty h1', doc('<h1> </h1>'), 'h1-empty'],
  ['duplicate id', doc('<h1>H</h1><p id="a"></p><p id="a"></p>'), 'duplicate-id'],
  ['broken fragment', doc('<h1>H</h1><a href="#nope">Jump</a>'), 'fragment-target'],
  ['nameless link', doc('<h1>H</h1><a href="/x/"></a>'), 'link-name'],
  ['link with only a no-alt image', doc('<h1>H</h1><a href="/x/"><img src="/a.png" alt=""></a>'), 'link-name'],
  ['image without alt attribute', doc('<h1>H</h1><img src="/a.png">'), 'img-alt'],
  ['nameless button', doc('<h1>H</h1><button type="button"></button>'), 'button-name'],
  ['iframe without title', doc('<h1>H</h1><iframe src="/m/"></iframe>'), 'iframe-title'],
  ['label for missing id', doc('<h1>H</h1><label for="zz">Z</label>'), 'label-for'],
  ['unlabelled input', doc('<h1>H</h1><input id="a" name="a">'), 'control-label'],
  ['input labelled by a different id', doc('<h1>H</h1><label for="b">B</label><input id="a" name="a"><input id="b" name="b">'), 'control-label'],
  ['implicit label with only aria-hidden text', doc('<h1>H</h1><label><span aria-hidden="true">Name</span><input name="n"></label>'), 'control-label'],
  ['unlabelled textarea', doc('<h1>H</h1><textarea name="m"></textarea>'), 'control-label'],
  ['aria-labelledby to missing id', doc('<h1>H</h1><input aria-labelledby="gone" name="a">'), 'aria-ref'],
  ['two mains, one with role=main', doc('<h1>H</h1><main role="main"></main>'), 'main-landmark'],
  ['div role=main beside native main', doc('<h1>H</h1><div role="main"></div>'), 'main-landmark'],
  ['button named only by aria-hidden text', doc('<h1>H</h1><button type="button"><span aria-hidden="true">X</span></button>'), 'button-name'],
  ['link named only by aria-hidden nested text', doc('<h1>H</h1><a href="/x/"><span aria-hidden="true"><b>X</b> y</span></a>'), 'link-name'],
  ['h1 with only aria-hidden text', doc('<h1><span aria-hidden="true">T</span></h1>'), 'h1-empty'],
  ['unwrapped radio sharing a name with a labelled one', doc('<h1>H</h1><label><input type="radio" name="r" value="a"> A</label><input type="radio" name="r" value="b">'), 'control-label'],
  ['second nameless input beside a wrapped one', doc('<h1>H</h1><label>Mail <input></label><input>'), 'control-label'],
  ['image input without alt', doc('<h1>H</h1><input type="image" src="/a.png">'), 'input-image-alt'],
];
for (const [name, html, code] of detects) test(`detects: ${name}`, () => assert.ok(codes(html).includes(code), `expected ${code}, got ${codes(html)}`));

test('checkDist reports a broken synthetic dist and passes a healthy one', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'a11y-'));
  try {
    fs.mkdirSync(path.join(dir, 'ok'));
    fs.writeFileSync(path.join(dir, 'ok/index.html'), good);
    assert.deepEqual(checkDist(dir).results, []);
    fs.mkdirSync(path.join(dir, 'bad'));
    fs.writeFileSync(path.join(dir, 'bad/index.html'), doc('<h1>H</h1><img src="/a.png"><a href="/x/"></a>'));
    const r = checkDist(dir).results;
    assert.deepEqual(r.map((x) => x.file), ['/bad/index.html', '/bad/index.html']);
    const cli = spawnSync(process.execPath, [path.resolve('scripts/check-accessibility.mjs')], { cwd: dir, encoding: 'utf8' });
    assert.equal(cli.status, 2, 'no dist/ in cwd');
    fs.renameSync(path.join(dir, 'ok'), path.join(dir, 'dist-tmp-ok'));
    fs.mkdirSync(path.join(dir, 'dist'));
    fs.renameSync(path.join(dir, 'bad'), path.join(dir, 'dist/bad'));
    const cli2 = spawnSync(process.execPath, [path.resolve('scripts/check-accessibility.mjs')], { cwd: dir, encoding: 'utf8' });
    assert.equal(cli2.status, 1);
    assert.match(cli2.stderr, /img-alt/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
