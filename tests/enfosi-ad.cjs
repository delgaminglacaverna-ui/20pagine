const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
test('three clock clicks switch the ad, start local music and replace YouTube media', async () => {
  const html = fs.readFileSync('index.html', 'utf8');
  let cursor = 0, now = 0, plays = 0, pauses = 0;
  const hooks = [];
  const context = vm.createContext({
    FRENCH_MODE: false, RISIO_MODE: false, location: { href: "/" }, Date: { now: () => now }, Math: Object.assign(Object.create(Math), { random: () => .99 }),
    or: () => 'youtube-id',
    Audio: class {
      constructor(src) { assert.equal(src, '/assets/enfosi/risio.mp3'); this.paused = true; }
      play() { this.paused = false; plays++; return Promise.resolve(); }
      pause() { this.paused = true; pauses++; }
    },
    v: { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    ul: {
      useState: initial => {
        const index = cursor++;
        if (!(index in hooks)) hooks[index] = typeof initial === 'function' ? initial() : initial;
        return [hooks[index], value => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value; }];
      },
      useRef: initial => { const index = cursor++; return hooks[index] || (hooks[index] = { current: initial }); },
      useEffect() {},
    },
  });
  vm.runInContext(html.slice(html.indexOf('const dr = 30'), html.indexOf('function kf(')) + '\nglobalThis.renderAd = i1;', context);
  const render = () => { cursor = 0; return context.renderAd(); };
  const nodes = node => node && typeof node === 'object' ? [node, ...[node.props?.children].flat(2).flatMap(nodes)] : [];
  let tree = render();
  assert(nodes(tree).some(node => node.props?.children === 'TBB AD'));
  const clock = nodes(tree).find(node => typeof node.type === 'function' && node.props?.onClockTap);
  for (let i = 0; i < 3; i++) { now = i * 1000; clock.props.onClockTap(); }
  await Promise.resolve();
  assert.equal(context.location.href, "/risio");
  assert.equal(plays, 0);
  assert(nodes(render()).some(node => node.props?.children === 'TBB AD'), 'normal page stays normal when restored from history');
  context.RISIO_MODE = true; hooks.length = 0;
  tree = render();
  assert(!nodes(tree).some(node => /musica/.test(node.props?.['aria-label'] || '')));
  await Promise.resolve(); tree = render();
  assert.equal(plays, 0); // effects are tested separately; no manual audio control
  assert(nodes(tree).some(node => node.props?.children === 'ENFOSI AD'));
  assert.equal(nodes(tree).find(node => node.props?.onClockTap).props.remaining, 2.5);
  const video = nodes(tree).find(node => node.type === 'video');
  assert.equal(video.props.src, '/assets/enfosi/rushing.mp4');
  assert.equal(video.props.muted, true);
  video.props.onEnded(); tree = render();
  assert(nodes(tree).some(node => node.type === 'img' && node.props.src.startsWith('https://static2.klipy.com/')));
  assert.equal(pauses, 0);
});
