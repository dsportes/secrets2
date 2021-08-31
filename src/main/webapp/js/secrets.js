Secrets = {
	/** Const ****************************************************************/
		
	lastHash : null,
	
	debug : true,
	
	regExpId : new RegExp(/^[0-9a-zA-Z\.]+$/),

	regExpIci : new RegExp(/^[0-9a-zA-Z\.\-\/]+$/),

	regExpHexa : new RegExp(/^[0-9a-z]+$/),

	erreurs : {
		"401" : "Accès réservé à l'administrateur de l'application", 
		"402" : "Accès réservé à l'administrateur de l'application", 
		"498" : "Serveur inaccessible (réseau, ... ?)", 
		"499" : "Requête au serveur interrompue par clic", 
		"501" : "Erreur technique du serveur", 
		"502" : "Bug : incompréhension entre navigateur et serveur", 
		"521" : "Bug : incompréhension entre navigateur et serveur",
		"522" : "Bug : incompréhension entre navigateur et serveur",
		"523" : "Bug : incompréhension entre navigateur et serveur",
		"524" : "Bug : incompréhension entre navigateur et serveur",
		"525" : "Bug : incompréhension entre navigateur et serveur",
		"526" : "Ce carnet de secrets n'est pas connu du serveur",
		"527" : "Ce pseudo n'est pas connu du serveur",
		"528" : "Le code PIN donné n'est pas celui enregistré sur le serveur pour ce pseudo",
		"529" : "Ce carnet existe sur le serveur mais il a une autre clé de cryptage",
		"530" : "Le code PIN est requis pour effectuer cette opération sur le serveur",
		"531" : "Ce carnet n'existe pas sur le serveur",
		"532" : "Le carnet cloné existe déjà (écrasement protégé)",
		"533" : "Le carnet est déjà protégé en écriture",
		"534" : "Le carnet ne peut être détruit que lorsqu'il est protégé en écriture",
		"535" : "Le carnet ne peut être détruit que 2 minutes après sa protection en écriture",
		"536" : "Sans code PIN seuls les carnets déclarés publics sont accessibles (lecture seule)",
		"537" : "Bug : incompréhension entre navigateur et serveur",
		"538" : "Le carnet est protégé en écriture, sa mise à jour n'est pas possible",
		"539" : "Le pseudo \"source\" est inconnu du serveur",
	},
	
	/** Méthodes surchargeable par ctrl *****************************************************/
	afficheErreur : function(status, texte){
		if (!status)
			status = 498;
		if (status == 499) {
			if (Serveur.lastRequest) Serveur.lastRequest.abort();
		}
		var msg = Secrets.erreurs[status];
		if (msg){
			Secrets.messageShow(msg, false, "" + status);
		} else {
			Secrets.texteAide = texte;
			Secrets.messageShow("Erreur technique inattendue. Cliquer sur le bouton "
					+ "d'aide pour plus de détails", false, "$" + texte);
		}
	},

	/** Model : Vue / Panel ****************************************************************/

	dir : {}, 		// set des carnets
	dir1 : [], 		// liste ordonnée des carnets
	cles : {}, 		// valeurs des clés pour leur md5 (pour l'ident actuel)

	carnet : { 		// carnet courant, existant ou à créer
		nom : "",
		cle: null,
		phrase : null,
		courant: null,
		nvLocal: 0,
		nomSecret : "",
	},

	secrets : {}, 	// set des secrets du carnet courant
	secrets1 : [], 	// liste ordonnée des secrets du carnet courant

	prefixes : [],	// admin : liste des pseudos existants
	prefixe : {},	// admin : ident courant
	carnets : [],	// admin : liste des carnets

	/** Model : session ***************************************************************/
	session : {
		appRootUrl : "",
		appUrl : "",
		
		estAdmin : false, 
		
		ici : "",
		ident : "",
		svIdent : false,
		md5PIN : "",
		svPIN : true,
		
		time : 0,

		srv : false,
		srvRO : false,
		srvVersion : "???",
		serveurTime : "",

		nbSyncL : 0,
		nbSyncS : 0,

		enclair : true,
		panelleft : "-60%",
		panel : null,
	},
	
	setIci : function(ici) {
		var s = Secrets.session;
		if (s.ici == ici)
			return;
		Local.setStorage(ici);
		if (!ici) {
			s.ici = "";
			Local.reset();
		} else {
			s.ici = ici;
			Local.load();
		}
		if (Secrets.carnet.nom)
			Secrets.loadCarnet();
		else
			Secrets.loadDir1();
	},

	resetIdent : function(id){
		var s = Secrets.session;
		if (s.estAdmin || id == s.ident)
			return false;
		s.svIdent = false;
		s.svPIN = false;
		s.md5PIN = "";
		Secrets.setIdent(id, null);
		return true;
	},
	
	setMd5PIN : function(md5PIN){
		Secrets.session.md5PIN = md5PIN ? md5PIN : "";
	},
	
	setIdent : function(id, md5PIN) { 
		// md5PIN peut être null, id est toujours non vide
		var s = Secrets.session;
		if (s.estAdmin)
			return;
		if (id != s.ident) {
			s.ident = id;
			Secrets.setMd5PIN(md5PIN);
			Secrets.carnet.nom = "";
			Local.reset();
			if (s.ici)
				Local.load();
			Serveur.reset();
			if (s.srv)
				Serveur.load();
			else
				Secrets.loadDir1();
			Secrets.setLocation1();
		} else {
			if (md5PIN && md5PIN != s.md5PIN) {
				s.md5PIN = md5PIN;
				Serveur.connecter();
			}
		}
	},

	setSrvStatus : function(arg) {
		var s = Secrets.session;
		s.srv = arg != 0;
		s.srvRO = arg == 1;
	},

	validerSecret : function(texte, secret, callback) {
		var se = Secrets.session;
		var v = texte ? Util.encrypt(texte.trim(), Secrets.carnet.cle) : "";
		var t = new Date().getTime();
		var x = {name:secret.name, wtt:t, wtf:se.ici, value:v}
		var s = Secrets.secrets[secret.name];
		if (!s) {
			Secrets.secrets[secret.name] = {name:secret.name};
			s = Secrets.secrets[secret.name];
		}
		
		var c = Secrets.carnet.courant;
		var b = false;
		if (c.l && !c.l.archive) {
			s.l = x;
			b = true;
			var y = {}
			y[x.name] = x;
			Local.maj(c.l, y, t);
		}
		
		if (c.s && !c.s.archive && (se.srv && !se.srvRO)) {
			s.s = x;
			var book = {name:c.name, md5Key:c.md5Key, wtt:t, secrets:[x]}
			Serveur.book(function(data){
				Secrets.listeSecrets2();
				if (callback)
					callback();
			}, null, 5, se.ident, se.md5PIN, book, null);
		} else {
			if (b)
				Secrets.listeSecrets2();
			if (callback)
				callback();
		}
	},

	sync : function(opt){
		// opt: 1 L<->S, 2 L<-S, 3 L->S
		var c = Secrets.carnet.courant;
		var el = false;
		var es = false;
		var y = {}
		var t = new Date().getTime();
		var book = {name:c.name, md5Key:c.md5Key, wtt:t, secrets:[]}
		for(var n in Secrets.secrets){
			var secret = Secrets.secrets[n];
			if (secret.sync == 2 && (opt == 1 || opt == 2)){
				y[secret.name] = {name:secret.name, wtt:secret.s.wtt, wtf:secret.s.wtf, value:secret.s.value};
				el = true;
			}
			if (secret.sync == 3 && (opt == 1 || opt == 3)){
				book.secrets.push({name:secret.name, wtt:secret.l.wtt, wtf:secret.l.wtf, value:secret.l.value});
				es = true;
			}
		}
		var b = false;
		
		if (!c.l || (c.l && !c.l.archive) && el) {
			if (!c.l)
				c.l = {name:c.name, crt:c.s.crt, crf:c.s.crf, md5Key:c.md5Key, phrase:c.s.phrase}
			Local.maj(c.l, y, t);
			b = true;
		}
		if (!c.s || (c.s && !c.s.archive) && Secrets.session.srv && !Secrets.session.srvRO && es) {
			book.phrase = c.l.phrase;
			book.crt = c.l.crt;
			book.crf = c.l.crf;
			Serveur.book(function(data){
				Serveur.set(book);
				Secrets.loadDir1();
				Secrets.loadCarnet();
			}, null, 5, Secrets.session.ident, Secrets.session.md5PIN, book);
		} else {
			if (b) {
				Secrets.loadDir1();
				Secrets.loadCarnet();
			}
		}
	},

	cloner : function(ncNom, ncPhrase, ncCle, callback){
		var se = Secrets.session;
		var c = Secrets.carnet.courant;
		if (c.l && c.s)
			var src = c.l.wtt >= c.s.wtt ? c.l : c.s;
		else
			var src = c.l ? c.l : c.s;
		var t = new Date().getTime();
		var book = {name:ncNom, wtt:t, crt:t, wtf:se.ici, crf:se.ici,
				rdt:0, rdf:"", phrase:ncPhrase, md5Key:Util.md5(ncCle), secrets:[]}
		for(var i = 0, s = null; s= src.secrets[i]; i++){
			if (!s.value)
				var v = "";
			else {
				var x = Util.decrypt(s.value, Secrets.carnet.cle);
				var v = Util.encrypt(x, ncCle);
			}
			book.secrets.push({name:s.name, wtt:s.wtt, wtf:s.wtf, value:v});
		}
		var ld1 = false;
		if (se.ici) {
			Local.nouveau(book.name, book.md5Key, book.phrase, t, book.secrets);
			ld1 = true;
		}
		if (se.srv && !se.srvRO){
			Serveur.book(function(data){
				Serveur.set(book);
				Secrets.loadDir1();
				if (callback) callback();
			}, null, 6, se.ident, se.md5PIN, book, null);
		} else {
			if (ld1)
				Secrets.loadDir1();
			if (callback) callback();
		}
	},
	
	setSupprCond : function(){
		var sc = {sLoc:0, sLocD:0, sSrv:0, sSrvD:0};
		var c = Secrets.carnet.courant;
		var t = new Date().getTime();
		if (Secrets.session.ici){
			if (c.l) {
				if (c.l.archive) {
					var d = Util.editD(t, c.l.wtt)
					if (!d) {
						sc.sLoc = 9;
					} else {
						sc.sLocD = d;
						sc.sLoc = 5;
					}
				} else
					sc.sLoc = 4;
			} else
				sc.sLoc = 3;
		} else
			sc.sLoc = 1;
		if (Secrets.session.srv){
			if (!Secrets.session.srvRO){
				if (c.s) {
					if (c.s.archive) {
						var d = Util.editD(t, c.s.wtt)
						if (!d) {
							sc.sSrv = 9;
						} else {
							sc.sSrvD = d;
							sc.sSrv = 5;
						}
					} else
						sc.sSrv = 4;
				} else
					sc.sSrv = 3;
			} else
				sc.sSrv = 2;
		} else
			sc.sSrv = 1;
		return sc;
	},

	supprimer : function(supprLocal, supprSrv, callback){
		if (supprLocal) {
			Local.supprimerCarnet(Secrets.carnet.courant.name);
			Secrets.carnet.courant.l = null;
		}
		if (supprSrv){
			var book = {name:Secrets.carnet.courant.name, md5Key:Secrets.carnet.courant.md5Key}
			Serveur.book(function(data){
				Secrets.carnet.courant.s = null;
				Secrets.finSuppr(callback);
			}, null, 8, Secrets.session.ident, Secrets.session.md5PIN, book);
		} else 
			Secrets.finSuppr(callback);
	},
	
	finSuppr : function(callback){
		if (Secrets.carnet.courant.s || Secrets.carnet.courant.l) {
			Secrets.loadDir1();
			Secrets.loadCarnet();
			if (callback) callback();
		} else {
			delete Secrets.dir[Secrets.carnet.courant.name + "$" + Secrets.carnet.courant.md5Key];
			Secrets.loadDir1();
			if (callback) callback();
			Secrets.setLocation1();
		}
	},

	exporter : function(srv, callback){
		var c = Secrets.carnet.courant;
		var src = srv ? c.s : c.l;
		var buf = [];
		var sep2 = "\n__________________________________________________________________";
		var sep1 = "\n------------------------------------------------------------------";
		var idx = []
		for (var i = 0, x = null; x = src.secrets[i]; i++)
			idx.push({n:x.name, i:i});
		idx.sort(function(a, b){
			return (a.n < b.n ? -1 : (a.n > b.n ? 1 : 0));
		});
		for (var j = 0, x = null; x = idx[j]; j++){
			s = src.secrets[x.i];
			if (s.value){
				var texte = Util.decrypt(s.value, Secrets.carnet.cle);
				buf.push(s.name + sep1.substring(0, s.name.length + 1) + "\n" + texte + sep2);
			}
		}
		var str = buf.join("\n");
		Util.save(str);
		if (callback) callback();
	},
	
	changerAP : function(nvArch, nvPub, callback) {
		var t = new Date().getTime();
		var c = Secrets.carnet.courant;
		var b = false;
		if (c.l){
			c.l.archive = nvArch;
			Local.maj(c.l, {}, t);
			b = true;
		}
		if (c.s && (Secrets.session.srv && !Secrets.session.srvRO)) {
			var book = {name:c.name, md5Key:c.md5Key, wtt:t, 
					archive:nvArch, pub:nvPub, secrets:[]}
			Serveur.book(function(data){
				Secrets.loadCarnet();
				if (callback) callback();
			}, null, 9, Secrets.session.ident, Secrets.session.md5PIN, book, null);
		} else {
			if (b)
				Secrets.loadCarnet();
			if (callback) callback();
		}
	},

	/*****************************************************************/
	loadDir1 : function(){
		var s = Secrets.session;
		Secrets.dir1.length = 0;
		var idir = [];
		for(var k in Secrets.dir) {
			idir.push(k);
			var e = Secrets.dir[k];
			if (e.l && e.s){
				e.lv = e.l.wtt > e.s.wtt;
				e.sv = e.l.wtt < e.s.wtt;
			}
			e.color = Secrets.cles[e.md5Key] ? "green" : "black";
		}
		idir.sort();
		for(var i = 0, k = null; k = idir[i]; i++)	Secrets.dir1.push(Secrets.dir[k]);
	},
	
	/*****************************************************************/
	loadCarnet : function(){
		var s = Secrets.session;
		var c = Secrets.carnet;
		if (!Secrets.session.srv) {
			if (s.ici)
				c.courant = Local.get(c.nom);
		} else {
			c.courant = Serveur.get(c.nom);
			if (!c.courant && s.ici)
				c.courant = Local.get(c.nom);
		}
		if (!c.courant) {
			Secrets.messageShow("Carnet [" + c.nom + "] inexistant. Retour à la liste", false);
			Secrets.setLocation1();
			return;
		}

		if (c.courant.s && s.srv)
			Serveur.book(function(data){
				if (data && data.book)
					c.courant.s = data.book;
				Secrets.listeSecrets();
			}, null, 3, s.ident, s.md5PIN ? s.md5PIN : null, {name: c.nom});
		else
			Secrets.listeSecrets();
	},
				
	listeSecrets : function() {
		var se = Secrets.session;
		var c = Secrets.carnet;
		Secrets.loadDir1();
		var s = c.courant.s;
		var l = c.courant.l;
		c.cle = Secrets.cles[c.courant.md5Key];
		c.phrase = s ? s.phrase : (l ? l.phrase : "");
		if (!c.cle) {
			if (Util.md5(c.phrase) == c.courant.md5Key){
				// la clé était en fait égale à la phrase !!! Sécurité nulle mais enfin ...
				c.cle = c.phrase;
				Secrets.cles[c.courant.md5Key] = c.phrase;
			}
		}
		if (!c.cle)
			Secrets.panelOn("saisirCle");
		c.courant.lrw = l ? (l.archive ? 1 : 3) : 0;
		c.courant.srw = s ? (s.archive ? 1 : ((se.srv && se.srvRO) && s.pub ? 2 : 3)) : 0;
		c.nvLocal = 0;
		if (c.courant.lrw > 1 && c.courant.srw > 1)
			c.nvLocal = 3;
		else {
			if (c.courant.lrw > 1)
				c.nvLocal = 1;
			if (c.courant.srw > 1)
				c.nvLocal = 2;
		}
		for (var y in Secrets.secrets) delete Secrets.secrets[y];
		if (c.courant.l) {
			var sl = c.courant.l.secrets;
			for(var i = 0, s = null; s = sl[i]; i++){
				var e = Secrets.secrets[s.name];
				if (!e){
					Secrets.secrets[s.name] = {name:s.name, l:s, s:null};
					e = Secrets.secrets[s.name];
				} else
					e.l = s;
			}
		}
		if (c.courant.s) {
			var sl = c.courant.s.secrets;
			for(var i = 0, s = null; s = sl[i]; i++){
				var e = Secrets.secrets[s.name];
				if (!e){
					Secrets.secrets[s.name] = {name:s.name, l:null, s:s};
					e = Secrets.secrets[s.name];
				} else
					e.s = s;
			}
		}
		Secrets.listeSecrets2();
	},
	
	listeSecrets2 : function() {
		var c = Secrets.carnet.courant;
		var s = Secrets.session;
		var il = [];
		s.nbSyncL = 0;
		s.nbSyncS = 0;
		c.egaux = true;
		
		var el = s.ici && (!c.l || (c.l && !c.l.archive));
		var es = s.srv && !s.srvRO && (!c.s || (c.s && !c.s.archive));
		for(var n in Secrets.secrets) {
			var secret = Secrets.secrets[n];
			Secrets.setStatus(secret, el, es);
			if (!secret.egal)
				c.egaux = false;
			if (!secret.vide) {
				if (secret.sync == 3) s.nbSyncL++;
				if (secret.sync == 2) s.nbSyncS++;
				il.push(n);
			}
		}
		il.sort();
		Secrets.secrets1.length = 0
		for(var i = 0, n = null; n = il[i]; i++) Secrets.secrets1.push(Secrets.secrets[n]);
	},
	
	setStatus : function(secret, el, es){
		secret.src = 0;
		secret.sync = 0;
		secret.vide = (!secret.l || !secret.l.value) && (!secret.s || !secret.s.value);
		if (secret.l && secret.s) {
			secret.egal  = secret.vide || secret.l.value == secret.s.value;
			secret.src = secret.l.wtt < secret.s.wtt ? 2 : (secret.egal ? 1 : 3);
		} else {
			secret.egal = false;
			if (secret.l)
				secret.src = 3;
			if (secret.s)
				secret.src = 2;
		}
		if (secret.src >= 2){
			if (secret.src == 2 && el) secret.sync = 2;
			if (secret.src == 3 && es) secret.sync = 3;
		} else if (secret.src == 1)
			secret.sync = 1;
		secret.source = [null, secret.l, secret.s, secret.l][secret.src];
	},

	/*****************************************************************/
	init : function(){
		var href = window.location.href;
		if (href.startsWith("http://secrets")){
			var x = "https:" + href.substring(5);
			window.location = x;
		}
		var s = Secrets.session;
		var m = "Démarrage de secrets [" + version_secrets + "] : " + Util.dh();
		Util.log(m);
		window.onhashchange = Secrets.parseHash;
		// Secrets.messageShow(m, false, "accueil");
		if (window.location.href.indexOf(".html#/admin") != -1){
			s.estAdmin = true;
			Secrets.setSrvStatus(2);
		} else {
			s.estAdmin = false;
        	Local.loadConfig();
		}
    	
    	var ac = document.getElementById("accueil");
    	setTimeout(function(){
    		ac.style.opacity = 0.;
    		setTimeout(function(){
    			ac.style.display = "none";
    		}, 600);
    	}, 300);
    	if (s.estAdmin)
    		Serveur.getVersion(Secrets.parseHash);
    	else
    		Secrets.parseHash();
	},

	parseHash : function() {
		var h = window.location.hash;
		if (h == Secrets.lastHash)
			return;
		Secrets.lastHash = h;
		var s = Secrets.session;
		var x = [];
		if (h && h.length > 2)
			var x = h.substring(2).split('/');
		if (s.estAdmin) {
			Secrets.carnets.length = 0;	
			if (x.length < 2 || x[1] == "0") {
				s.ident = "";
				Serveur.listerIdents();
				Secrets.vueOn("admin");
			} else {
				s.ident = x[1];
				Serveur.getIdent();
				Secrets.vueOn("adminid");
			}
			return;
		}
		
		if (x.length < 2 || x[0] != "carnets"){
			Secrets.setLocation0();
			return;
		}
		
		var id = x[1] && x[1] != "0" ? x[1] : "";
		if (!id && !Secrets.session.ident) {
			Secrets.panelOn("changerIdent");
			return;
		}
		if (id && id != Secrets.session.ident) {
			Local.reset();
			Serveur.reset();
		}
		if (id)
			Secrets.session.ident = id;
		Secrets.carnet.nom = "";
		if (s.ici)
			Local.load();
		else
			Local.reset();
		if (s.srv)
			Serveur.load();
		else {
			Serveur.reset();
			Secrets.loadDir1();
		}
		
		var carnet = x.length > 2 ? x[2] : "";
		if (carnet){
			Secrets.carnet.nom = carnet;
			Secrets.loadCarnet();
			Secrets.vueOn("carnet");		
		} else
			Secrets.vueOn("dir");
	},

	setLocationA : function(){
		var s = Secrets.session;
		s.ident == "";
		s.etape = 0;
		Secrets.carnets.length = 0;
		setTimeout(function() {
			window.location.hash = "#/admin";
		}, 50);
	},

	setLocationA2 : function(ident){
		window.location.hash = "#/admin/" + ident;
	},

	setLocation0 : function(){
		window.location.hash = "#/carnets/0";
	},
	
	setLocation1 : function(){
		window.location = "#/carnets/" + Secrets.session.ident;
	},

	setLocation2 : function(carnet){
		window.location = "#/carnets/" + Secrets.session.ident + "/" + carnet;
	},

	quitter : function(){
		window.location = "/aurevoir.html";
	}
}

/**********************************************************/
Local = {
	config : null,
	
	eraseStorage : function() {
		var ls = window.localStorage;
		for(var k in ls){
			if (k.startsWith("$book$"))
				ls.removeItem(k);
		}
		var cfg = Local.getConfig();
		if (cfg.md5PIN || cfg.prefix){
			delete cfg.localSpaceName;
			ls.setItem("$config$", JSON.stringify(cfg));
		} else
			ls.removeItem("$config$");
	},
	
	setStorage : function(nom){
		if (!nom)
			Local.eraseStorage()
		else {
			var ls = window.localStorage;
			var cfg = Local.getConfig();
			cfg.localSpaceName = nom;
			ls.setItem("$config$", JSON.stringify(cfg));
		}
	},
	
	saveIdent : function(ident, md5PIN) {
		var cfg = Local.getConfig();
		var ls = window.localStorage;
		Secrets.session.svIdent = false;
		Secrets.session.svPIN = false;
		if (ident){
			cfg.prefix = ident;
			Secrets.session.svIdent = true;
			if (md5PIN) {
				cfg.md5Pin = md5PIN;
				Secrets.session.svPIN = true;
			} else {
				if (cfg.md5Pin)
					delete cfg.md5Pin;
			}
    		ls.setItem("$config$", JSON.stringify(cfg));
		} else {
			if (cfg.localSpaceName) {
				if (cfg.md5Pin)
					delete cfg.md5Pin;
				if (cfg.prefix)
					delete cfg.prefix;
	    		ls.setItem("$config$", JSON.stringify(cfg));				
			} else
				ls.removeItem("$config$");
		}
	},
	
	getConfig : function() {
	    try {
			var str = window.localStorage.getItem("$config$");
	    	if (str && str != "undefined") {
	    		return JSON.parse(str);
	    	} else
	    		return {};
	    } catch (e) { 
	    	return {};
	    }
	},
	
	loadConfig : function() {
	    var cfg = Local.getConfig();
    	if (cfg.prefix) {
    		Secrets.session.svIdent = true;
    		Secrets.session.svPIN = cfg.md5Pin ? true : false;
    		Secrets.session.ident = cfg.prefix;
    		Secrets.setMd5PIN(cfg.md5Pin);
    	} else {
    		Secrets.session.svIdent = false;
    		Secrets.session.svPIN = false;
    	}
    	var x = cfg.localSpaceName;
    	Secrets.session.ici = x ? x : "";
	},
	
	reset : function(){
		var aSuppr = {}
		for(var k in Secrets.dir)
			if (Secrets.dir[k].l) aSuppr[k] = true;
		for(var k in aSuppr)
			if (!Secrets.dir[k].s) 
				delete Secrets.dir[k];
			else
				Secrets.dir[k].l = null;
	},

	load : function(){
		var aSuppr = {}
		for(var k in Secrets.dir)
			if (Secrets.dir[k].l) aSuppr[k] = true;
		var ls = window.localStorage;
		var pfx = "$book$" + Secrets.session.ident + "@";
		for(var i = 0; i < ls.length; i++){
			var k = ls.key(i);
			if (k.startsWith(pfx)){
		        try {
		    		var str = ls.getItem(k);
	    			var c = str ? JSON.parse(str) : null;
		    		if (!c) 
		    			continue;
		    		c.archive = c.archive ? true : false;
		    		c.pub = c.pub ? true : false;
		        	var idc = c.name + "$" + c.md5Key;
		        	var e = Secrets.dir[idc];
		        	if (!e){
		        		e = {name:c.name, md5Key:c.md5Key}
		        		Secrets.dir[idc] = e;
		        	}
		        	e.l = c;
		        	if (aSuppr[idc])
		        		delete aSuppr[idc];
		        } catch (e) {
		        	continue;
		        }
			};
		}
		for(var k in aSuppr[idc])
			if(!Secrets.dir[k].s) 
				delete Secrets.dir[k];
			else
				Secrets.dir[k].l = null;
	},
	
	get : function(nomCarnet){
		for(var k in Secrets.dir){
			var e = Secrets.dir[k];
			if (e.l && e.name == nomCarnet)
				return e;
		}
		return null;
	},
	
	maj : function(carnet, secretSet, t){
		carnet.wtt = t;
		carnet.wtf = Secrets.ici;
		var sec = [];
		for (var n in secretSet)
			sec.push(secretSet[n]);
		if (carnet.secrets && carnet.secrets.length) {
			for (var i = 0, s = null; s = carnet.secrets[i]; i++)
				if (!secretSet[s.name])
					sec.push(s);
		}
		carnet.secrets = sec;
		var str = JSON.stringify(carnet);
		var key = "$book$" + Secrets.session.ident + "@" + carnet.name;
		window.localStorage.setItem(key, str);
	},
	
	nouveau : function(nomCarnet, cle, phrase, tx, secrets){
		var e = this.get(nomCarnet);
		if (e) {
			if (e.l.md5Key == cle)
				Secrets.messageShow("Ce carnet existe déjà (avec la même clé de cryptage).", true);
			else
				Secrets.messageShow("Ce carnet existe déjà avec une autre clé de cryptage.", false);
			return false;
		}
		var k = "$book$" + Secrets.session.ident + "@" + nomCarnet;
		var t = tx ? tx : new Date().getTime();
		var ici = Secrets.session.ici;
		c = { name: nomCarnet, md5Key: cle, phrase: phrase, secrets:secrets ? secrets : [],
			crt:t, crf:ici, wtt:t, wtf:ici, rdt:t, rdf:ici, archive: false, pub: false }
		var json = JSON.stringify(c);
		window.localStorage.setItem(k, json);
		var idc = c.name + "$" + c.md5Key;
    	var e = Secrets.dir[idc];
    	if (!e){
    		e = {name:c.name, md5Key:c.md5Key}
    		Secrets.dir[idc] = e;
    	}
    	e.l = c;
		Secrets.messageShow("Le carnet a été créé en local.", true);
		Local.load();
		return true;
	},
		
	supprimerCarnet : function(nomCarnet){
		var k = "$book$" + Secrets.session.ident + "@" + nomCarnet;
		window.localStorage.removeItem(k);
		Local.load();
		Secrets.loadDir1();
	},

    svConfig : function() {
    	if (Secrets.session.ici)
    		window.localStorage.setItem("$config$", JSON.stringify(Local.config));
    }

}

/**********************************************************/
Serveur = {
	numero : 0,
	lastRequest : null,
	numOff : 0,
	
	getVersion : function(callback){		
		Serveur.numero++;
		Secrets.spinnerOn({num:Serveur.numero});
		Serveur.lastRequest = new Request('/version', null,
				{numero:Serveur.numero, lstStatus:null, callback:callback},
			function(data, status, headers, config) {
		   		if (config.numero != Serveur.numero)
		   			return;
		   		Secrets.spinnerOff({num:Serveur.numero});
		   		if (data && data.version){
		   			Secrets.srvVersion = data.version;
		   			Util.log("Version de l'application sur le serveur : " + Secrets.srvVersion);
		   			if (Secrets.srvVersion != version_secrets) {
		   				var nurl = Secrets.session.appUrlRoot + "_" + Secrets.srvVersion + ".html";
		   				// var nurl = Secrets.session.appUrlRoot + ".html";
		   				window.alert("Version actuelle : " + version_secrets + "\nLa version " +
		   						Secrets.srvVersion + " est disponible.\nL'application va être relancée pour la charger.");
		   				setTimeout(function(){
		   					window.location = nurl + (location.hash.length ? location.hash : "");
		   				}, 200);
		   			}
		   		}
		   		if (callback)
		   			callback();
		    }, 
		    function(data, status, headers, config) {
		   		if (config.numero != Serveur.numero)
		   			return;
		   		Secrets.spinnerOff({num:Serveur.numero});
		   		if (callback)
		   			callback();
		    });
	},

	serveur : function(callback, lstStatus, isAdmin, arg){
		Serveur.numero++;
		Secrets.spinnerOn({num:Serveur.numero});
		Serveur.lastRequest = new Request(isAdmin ? '/admin' : '/secrets', arg, 
				{numero:Serveur.numero, lstStatus:lstStatus, callback:callback},
			function(data, status, headers, config) {
		   		if (config.numero != Serveur.numero)
		   			return;
		   		Secrets.spinnerOff({num:Serveur.numero});
		   		if (config.callback)
		   			config.callback(data);
		    },
		    function(data, status, headers, config) {
		   		if (config.numero != Serveur.numero)
		   			return;
		   		Secrets.spinnerOff({num:Serveur.numero});
		    	var lst = config.lstStatus;
		    	if (lst && lst.indexOf(status) != -1 && config.callback)
			   		config.callback(status);
		    	else
		    		Secrets.afficheErreur(status, data);
		    });
	},

	admin : function(callback, lstStatus, cmd, prefix, md5Pin, bookName, source){
			var arg = {cmd:cmd};
			if (prefix)
				arg.prefix = prefix;
			if (md5Pin)
				arg.md5Pin = md5Pin;
			if (bookName)
				arg.book = bookName;
			if (source)
				arg.source = source;
			Serveur.serveur(callback, lstStatus, true, arg);
	},

	listerIdents : function(){
		Serveur.admin(function(data){
			Secrets.prefixes.length = 0;
			for(var i = 0, x = null; x = data[i]; i++)
				Secrets.prefixes.push(x);
			Secrets.prefixes.sort(function(a,b){
				return a.name < b.name ? -1 : (a.name == b.name ? 0 : 1);
			});
		}, null, 1);
	},

	book : function(callback, lstStatus, cmd, prefix, md5Pin, book, newMd5PIN){
		var arg = {cmd:cmd};
		if (prefix)
			arg.prefix = prefix;
		if (md5Pin)
			arg.md5Pin = md5Pin;
		if (book)
			arg.book = book;
		if (newMd5PIN)
			arg.newMd5Pin = newMd5PIN;
		if (Secrets.session.ici)
			arg.from = Secrets.session.ici;
		Serveur.serveur(callback, lstStatus, false, arg);
	},

	connecter2 : function(){
		Secrets.setSrvStatus(0);
		Serveur.book(function(data){
			Secrets.session.serveurTime = data.time;
			Secrets.setSrvStatus(data.ro ? 1 : 2);
			Serveur.load();
		}, null, 11, Secrets.session.ident, Secrets.session.md5PIN);
	},

	connecter : function(){
		if (Secrets.srvVersion)
			Serveur.connecter2();
		else
			Serveur.getVersion(Serveur.connecter2);
	},
	
	reset : function(){
		var aSuppr = {}
		for(var k in Secrets.dir)
			if (Secrets.dir[k].s) aSuppr[k] = true;
		for(var k in aSuppr)
			if (!Secrets.dir[k].l) 
				delete Secrets.dir[k];
			else
				Secrets.dir[k].s = null;
	},
	
	load : function(reset){
		var aSuppr = {}
		for(var k in Secrets.dir)
			if (Secrets.dir[k].s) aSuppr[k] = true;
		Serveur.book(function(data){
			for(var i = 0, c = null; c = data[i]; i++) {
	    		c.archive = c.archive ? true : false;
	    		c.pub = c.pub ? true : false;
	    		var idc = c.name + "$" + c.md5Key;
	        	var e = Secrets.dir[idc];
	        	if (!e){
	        		e = {name:c.name, md5Key:c.md5Key}
	        		Secrets.dir[idc] = e;
	        	}
	        	e.s = c;
	        	delete aSuppr[idc];
			}
			for(var k in aSuppr)
				if (!Secrets.dir[k].l) 
					delete Secrets.dir[k];
				else
					Secrets.dir[k].s = null;
			Secrets.loadDir1();
			if (Secrets.carnet.nom)
				Secrets.loadCarnet();
		}, null, 10, Secrets.session.ident, Secrets.session.md5PIN);
	},

	get : function(nomCarnet){
		for(var k in Secrets.dir){
			var e = Secrets.dir[k];
			if (e.s && e.name == nomCarnet)
				return e;
		}
		return null;
	},
	
	set : function(c){
		var k = c.name + "$" + c.md5Key;
		var e = Secrets.dir[k];
		if (!e){
    		e = {name:c.name, md5Key:c.md5Key}
    		Secrets.dir[k] = e;
		}
		e.s = c;
	},
	
	supprPrefixe : function() {
		if (Secrets.session.ident) {
			Serveur.admin(function(data){
				Secrets.messageShow("Pseudo [" + Secrets.session.ident + "] supprimé avec succès", true);
				Secrets.panelOff(function() {
					Secrets.setLocationA();
					setTimeout(function(){Serveur.listerIdents();}, 1000);
				});
			}, null, 3, Secrets.session.ident);
		}
	},
	
	listerCarnets : function(){
		Serveur.admin(function(data){
			if (data === 527) {
				Secrets.messageShow("Le pseudo [" + Secrets.session.ident + "] a été supprimé. Retour à la liste des pseudos.", false);
				Secrets.setLocationA();
				return;
			}
			Secrets.carnets.length = 0;
			for(var i = 0, x = null; x = data[i]; i++) Secrets.carnets.push(x);
			Secrets.carnets.sort(function(a,b){
				return a.name < b.name ? -1 : (a.name == b.name ? 0 : 1);
			})
		}, [527], 4, Secrets.session.ident);
	},
	
	getIdent : function(){
		Serveur.admin(function(data){
			if (data === 527) {
				Secrets.messageShow("Le pseudo [" + Secrets.session.ident + "] a été supprimé, retour à la liste des pseudos.", false);
				Secrets.setLocationA();
				return;
			}
			Secrets.session.time = data.time;
			Secrets.setMd5PIN(data.pin);
			Serveur.listerCarnets();
		}, [527], 6, Secrets.session.ident);
	},
	
	supprCarnet : function(nomCarnet){
		var b = window.confirm("Ce carnet va être définitivement supprimé. Confirmer ou annuler.");
		if (b) {
			Serveur.admin(function(data){
				if (data === 527) {
					Secrets.messageShow("Le pseudo [" + Secrets.session.ident + "] a été supprimé. Rafraîchir la liste dans quelsues secondes.", false);
					Secrets.setLocationA();
					return;
				}
				Secrets.panelOff(function() {
					Serveur.listerCarnets();
				});
			}, [526,527], 5, Secrets.session.ident, null, nomCarnet);
		}
	}

}
