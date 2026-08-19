
(()=>{try{
  const saved=localStorage.getItem('vedator-ui-theme-v1');
  const dark=matchMedia?.('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme=saved==='light'||saved==='dark'?saved:(dark?'dark':'light');
}catch{document.documentElement.dataset.theme='light'}})();
