window.addEventListener('polymer-ready', function(){
	Secrets.init();
});

Secrets.session.appUrlRoot = "/p/app";

Secrets.showAide = function(arg){
	var event = new CustomEvent("secrets-aide", {detail: arg, bubbles: false});
	window.dispatchEvent(event);
}

Secrets.spinnerOn = function(data){
	var event = new CustomEvent("secrets-spinnerOn", {detail:data, bubbles: false});
	window.dispatchEvent(event);
}

Secrets.spinnerOff = function(data){
	var event = new CustomEvent("secrets-spinnerOff", {detail:data, bubbles: false});
	window.dispatchEvent(event);
}

Secrets.messageShow = function(texte, info, refAide){
	var d = {texte: texte, info:info, refAide : refAide ? refAide : null};
	var event = new CustomEvent("secrets-message", {detail: d, bubbles: false});
	window.dispatchEvent(event);
}

Secrets.vueOn = function(nomVue){
	var event = new CustomEvent("secrets-vue", {detail: nomVue, bubbles: false});
	window.dispatchEvent(event);
}

Secrets.panelOn = function(panel, delai){
	Secrets.session.panel = panel;
	setTimeout(function(){
		Secrets.session.panelleft = "0";
	}, delai ? delai : 0)
}

Secrets.panelOff = function(onClose){
	Secrets.session.panelleft = "-60%";
	setTimeout(function(){
		Secrets.session.panel = null;
		if (onClose)
			onClose();
	}, 300)
}
