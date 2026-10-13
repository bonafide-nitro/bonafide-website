// Block 45 (Issue #107): the /products/ and /products-2/ blocker text must not claim restored evidence is missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const { remaining } = JSON.parse(fs.readFileSync('qa/qa.config.json', 'utf8')).nonArticleScaffold;

for (const route of ['/products/', '/products-2/']) {
  test(`${route} blocker text does not call restored images/alt/meta missing`, () => {
    const text = remaining[route];
    assert.ok(text, route);
    assert.doesNotMatch(text, /image binaries and alt text not preserved/i);
    assert.doesNotMatch(text, /meta description (is )?not preserved/i);
  });
  test(`${route} blocker text still names the unmet store inventory`, () => {
    assert.match(remaining[route], /unresolved/);
    assert.match(remaining[route], route === '/products/' ? /16 historical/ : /22 historical/);
  });
}
