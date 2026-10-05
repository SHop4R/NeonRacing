// Keep the static page covered until styles, fonts and the first 3D frame are ready.
try {
  await import('./main.js');
  await document.fonts.ready;
  requestAnimationFrame(()=>{
    document.getElementById('game').inert=false;
    document.documentElement.removeAttribute('data-startup');
  });
} catch(error) {
  document.getElementById('loading').textContent='Unable to load the game. Please reload.';
  console.error(error);
}
