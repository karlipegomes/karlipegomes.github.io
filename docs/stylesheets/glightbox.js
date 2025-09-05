document$.subscribe(() => {
    console.log("Página carregada, inicializando scripts...");
    
    if (typeof d3 === "undefined") {
      console.error("Erro: D3.js não carregado!");
    } else {
      console.log("D3.js carregado com sucesso!");
    }
  
    const lightbox = GLightbox({
      touchNavigation: true,
      loop: false,
      zoomable: true,
      draggable: true,
      openEffect: "zoom",
      closeEffect: "zoom",
      slideEffect: "slide"
    });
  
    lightbox.reload();
  });
  