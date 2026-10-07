import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unportaledFixed, shellRoots, stickyPageTransforms } from './checkFixedOverlays.mjs';

test('un `fixed` nu est signalé, le même dans un <Portal> ne l’est pas', () => {
  assert.deepEqual(unportaledFixed('return (<>\n<aside className="fixed right-0" />\n</>);'), [2]);
  assert.deepEqual(unportaledFixed('return (<Portal>\n<aside className="fixed right-0" />\n</Portal>);'), []);
  assert.deepEqual(unportaledFixed('<div style={{ position: \'fixed\' }} />'), [1]);
  assert.deepEqual(unportaledFixed('// className="fixed" en commentaire\n<div className="sticky" />'), []);
  assert.deepEqual(unportaledFixed('<Portal><a className="fixed"/></Portal>\n<b className="fixed inset-0"/>'), [2]);
});

test('seuls les composants montés par Shell hors de <main> sont exemptés', () => {
  const roots = shellRoots('<div><Sidebar />\n<main><TopBar />\n<Outlet /></main>\n<Doctopus />\n</div>');
  assert.ok(roots.has('Sidebar') && roots.has('Doctopus'));
  assert.ok(!roots.has('TopBar') && !roots.has('Outlet'));
});

test('un wrapper de page qui garde son transform est signalé', () => {
  assert.deepEqual(stickyPageTransforms('  .reveal { animation: reveal-up 0.25s ease both; }'), ['.reveal']);
  assert.deepEqual(stickyPageTransforms('  .stagger > * { animation: reveal-up 0.3s ease forwards; }'), ['.stagger > *']);
  assert.deepEqual(stickyPageTransforms('  .reveal { animation: reveal-up 0.25s ease backwards; }'), []);
});
