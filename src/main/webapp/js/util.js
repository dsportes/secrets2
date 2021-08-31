Date.prototype.format = function(format) {
	var fullYear = this.getYear();
	if (fullYear < 1000)
		fullYear = fullYear + 1900;
	var hour = this.getHours();
	var day = this.getDate();
	var month = this.getMonth() + 1;
	var minute = this.getMinutes();
	var seconde = this.getSeconds();
	var ms = this.getMilliseconds();
	var reg = new RegExp('(d|m|Y|H|i|s|S)', 'g');
	var replacement = new Array();
	replacement['d'] = day < 10 ? '0' + day : day;
	replacement['m'] = month < 10 ? '0' + month : month;
	replacement['S'] = ms < 10 ? '00' + ms : (ms < 100 ? '0' + ms : ms);
	replacement['Y'] = fullYear;
	replacement['H'] = hour < 10 ? '0' + hour : hour;
	replacement['i'] = minute < 10 ? '0' + minute : minute;
	replacement['s'] = seconde < 10 ? '0' + seconde : seconde;
	return format.replace(reg, function($0) {
		return ($0 in replacement) ? replacement[$0] : $0.slice(1, $0.length - 1);
	});
};

Date.prototype.stdFormat = function() { return this.format("Y-m-d H:i:s"); };

/**********************************************/
String.prototype.startsWith = function(str) {
	return (!str || (this.length >= str.length && this.substring(0, str.length) == str));
}

/**********************************************/
Request = function(path, arg, config, callbackOK, callbackKO) {
	this.aborted = false;
	this.config = config;
	this.callbackOK = callbackOK;
	this.callbackKO = callbackKO;
    try {
    	if (arg)
    		var json = JSON.stringify(arg);
		this.xhr = new XMLHttpRequest();
		this.xhr.open("POST", path, true);
		var self = this;
		this.xhr.onreadystatechange = function(event) { 
			self.onready(event); 
		};
		if (arg)
			this.xhr.send(json);
		else
			this.xhr.send();
		return;
    } catch (e){
    	var exs = e.toString();
    }
    this.aborted = true;
    this.callbackKO(exs, 497, null, this.config);
};

Request.prototype.abort = function(){
	this.aborted = true;
	if (this.xhr)
		this.xhr.abort();
};
	
Request.prototype.onready = function(){
	if (this.aborted || !this.xhr || this.xhr.readyState != 4) 
		return;
	if (this.xhr.status == 200) {
        try {
        	var data = JSON.parse(this.xhr.responseText);
        	this.callbackOK(data, this.xhr.status, null, this.config);
        } catch (e) {
        	var exs = e.toString();
        }
        if (exs)
        	this.callbackKO(exs, 497, null, this.config);
	} else
		this.callbackKO(this.xhr.responseText, this.xhr.status, null, this.config);
};

/**********************************************/
Util = {
	log : function(msg){
		if (Secrets.debug && msg)
			console.log(new Date().format("Y-m-d H:i:s.S") + " - " + msg);
	},

	md5 : function(arg) { return arg ? MD5(arg) : ""},
		
	encrypt : function(texte, cle) { return texte ? Aes.Ctr.encrypt(texte, cle, 256) : ""; },

	decrypt : function(texte, cle) { return texte ? Aes.Ctr.decrypt(texte, cle, 256) : ""; },

	dh : function(d) { 
		return d ? (typeof d == "Date" ? d.stdFormat() : new Date(d).stdFormat()) : new Date().stdFormat();
	},
	
	editD : function(t, wtt){
		var d = t - wtt;
		if (d >= 1 * 60000)
			return null;
		if (d < 2 * 60000)
			return "moins de 2 minutes";
		return "" + Math.floor(d / 60000) + " minutes";
	},

	edf : function(f) { return !f ? " / Serveur" : " / " + f ; },
	edt : function(t) { return !t ? "" : Util.dh(t);},
	ednbx : function(n, mot) {
		  if (!n) return "aucun " + mot;
		  if (n == 1) return "1 " + mot;
		  return "" + n + " " + mot + "s"; 
	},
	
	save : function (texte) {
		try {
		var a = document.getElementById('save-link');
		var b;
			try {
				b = new Blob([texte]);
				b.type = 'text/plain';
			} catch(x) {
				b = new (window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder);
				if (!b) {
					Secrets.messageShow("Sauvegarde sur disque non supportée par ce navigateur", false);
					return;
				}
				b.append(text);
				b = b.getBlob('text/plain');
			}
			var u = (window.URL || window.webkitURL).createObjectURL(b);
			if (u !== u + '') {
				Secrets.messageShow("Sauvegarde sur disque non supportée par ce navigateur", false);
				return;
			}
			a.href = u;
			a.click();
		} catch(e){
			alert("Ce navigateur ne supporte pas la fonctionnalité d'exportation sur un fichier local.");
		}
	}

}
