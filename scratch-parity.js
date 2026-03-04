/*
  Browser-friendly parity helpers adapted from Rendering/util/cast.js and
  Rendering/util/math-util.js so the animator behaves closer to Scratch VM.
*/
(function attachScratchParity(globalScope) {
  const ScratchParity = {
    toNumber(value) {
      if (typeof value === 'number') {
        return Number.isNaN(value) ? 0 : value;
      }
      const n = Number(value);
      return Number.isNaN(n) ? 0 : n;
    },
    degToRad(degrees) {
      return (Math.PI * degrees) / 180;
    },
    radToDeg(radians) {
      return (radians * 180) / Math.PI;
    }
  };

  globalScope.ScratchParity = ScratchParity;
})(window);
