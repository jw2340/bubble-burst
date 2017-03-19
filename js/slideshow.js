$(document).ready(function(){

  var slides = document.getElementsByClassName("mySlides");
  var slideIndex = Math.floor(Math.random() * slides.length);
  showSlides(slideIndex);

  function showSlides(n) {
    slides[n].style.display = "inline";
  }

});
