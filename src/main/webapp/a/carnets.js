var carnets = angular.module('carnets', []);

carnets.controller("carnetsIdCtrl", ["$scope", function ($scope) {

		$scope.nouveauCarnet = function(){
			$scope.ncNom = "";
			$scope.ncCle = "";
			$scope.ncCle2 = "";
			$scope.ncPhrase = "";
			$scope.changeNcNom();
			$scope.changeNcPhrase();
			$scope.panelOn('creerNC');
		}
		
		$scope.setDisableNC = function(){
			$scope.idem = !$scope.ncNom;
			$scope.disable = $scope.idem || ($scope.ncCleErr || $scope.ncCle != $scope.ncCle2 || $scope.ncNomErr || $scope.ncPhraseErr);
		}

		$scope.changeNcNom = function(){
			var n = $scope.ncNom;
			if (!n) {
				$scope.ncNomErr = false;
				$scope.ncNomDiag = "Le nom du carnet est requis (lettres majuscules / minuscules, chiffres, points seulement)";
			} else {
				if (!n.match(Secrets.regExpId)) {
					$scope.ncNomErr = true;
					$scope.ncNomDiag = "Un nom de carnet ne peut contenir que des lettres majuscules / minuscules, des chiffres et des points";
				} else {
					var existe = false;
					for(var i = 0, e = null; e = $scope.dir[i]; i++)
						if (e.name == n)
							existe = true;
					$scope.ncNomErr = existe;
					$scope.ncNomDiag = existe ? "Un carnet porte déjà ce nom" : "";
				}
			}
			$scope.setDisableNC();
		}

		$scope.changeNcCle = function(){
			$scope.ncCleErr = $scope.ncCle.length < 8;
			$scope.setDisableNC();
		}

		$scope.changeNcPhrase = function(){
			$scope.ncPhraseErr = $scope.ncPhrase.length < 8;
			$scope.setDisableNC();
		}

		$scope.creerNC = function() {
			if (!$scope.disable) {
				var book = {name: $scope.ncNom,	md5Key: Util.md5($scope.ncCle),	phrase: $scope.ncPhrase	}
				var ld1 = false;
				if (Secrets.session.ici) {
					Local.nouveau(book.name, book.md5Key, book.phrase);
					ld1 = true;
				}
				if (Secrets.session.srv && !Secrets.session.srvRO) {
					Serveur.book(function(data){
						Serveur.load();
					}, null, 4, Secrets.session.ident, Secrets.session.md5PIN, book, null);
				} else
					if (ld1)
						Secrets.loadDir1();
				$scope.panelOff();
			}
		}

		/*******************************************************/
		$scope.clickCarnet = function(carnet){
			Secrets.setLocation2(carnet.name);
		}
		
}]);

carnets.controller("carnetsCarnetCtrl", 
		["$scope", function ($scope) {
			$scope.lib = ["n'existe pas", "lecture (protégé)", "lecture (pas de PIN et privé)", "lecture et écriture"]

			/*************************************************/
			$scope.testCle = function(){
				var c = Util.md5($scope.ncCle);
				if ($scope.carnet.courant.md5Key == c) {
					$scope.carnet.cle = $scope.ncCle;
					Secrets.cles[c] = $scope.carnet.cle;
					$scope.panelOff();
				} else
					$scope.carnet.cle = null;
			}

			$scope.fermerCle = function() {
				$scope.panelOff(function(){ 
					Secrets.setLocation1(); 
				});
			}

			/*************************************************/
			$scope.nouveauSecret = function(){
				$scope.nvNom = "";
				$scope.texte = "";
				$scope.texteI = "";
				$scope.nvSecret = true;
				$scope.erreurSC = false;
				$scope.editeSC = false;
				$scope.erreurSC = false;
				var c = Secrets.carnet.courant;
				var s = Secrets.session;
				var el = c.l && !c.l.archive;
				var es = c.s && !c.s.archive && (s.srv && !s.srvRO);
				if (!el && !es) {
					Secrets.messageShow("Le carnet n'est pas éditable", false, "carnetPasEdit");
				} else {
					$scope.secret = {name:"", wtt:0, editable:true};
					$scope.editable = true;
					$scope.changeNomSecret();
					$scope.panelOn("secret");
				}
			}

			/*************************************************/
			$scope.editerSecret = function(nomSecret){
				Secrets.carnet.nomSecret = nomSecret;
				
				$scope.nvNom = "";
				$scope.nvSecret = false;
				$scope.editeSC = false;
				$scope.erreurSC = false;
				$scope.secret = Secrets.secrets[Secrets.carnet.nomSecret];
				var src = $scope.secret.source;
				$scope.texte = !src.value ? "" : Util.decrypt(src.value, $scope.carnet.cle).trim();
				$scope.texteI = $scope.texte;
				$scope.secret.wtt = src.wtt;
				$scope.secret.wtf = src.wtf;
				var c = Secrets.carnet.courant;
				var s = Secrets.session;
				var el = c.l && !c.l.archive;
				var es = c.s && !c.s.archive && (s.srv && !s.srvRO);
				if (!el && !es)
					$scope.editable = false;
				else
					$scope.editable = !(($scope.secret.l && !$scope.secret.s && !el) 
							|| (!$scope.secret.l && $scope.secret.s && !es));
				$scope.changeTexteSecret();
				$scope.panelOn("secret");
			}
			
			$scope.changeTexteSecret = function(){
				$scope.editeSC = $scope.texte.trim() != $scope.texteI;
			}
			
			$scope.changeNomSecret = function(){
				$scope.secret.name = $scope.nvNom;
				var e = $scope.secret.name ? Secrets.secrets[$scope.secret.name] : null;
				$scope.erreurSC = e && !e.vide;
			}
			
			$scope.validerSecret = function() {
				if ((!$scope.nvSecret && !$scope.editeSC) || $scope.erreurSC)
					return;
				Secrets.validerSecret($scope.texte, $scope.secret, Secrets.panelOff);
			}
			
			/*************************************************/
			$scope.editerAP = function(){
				var c = Secrets.carnet.courant;
				var s = Secrets.session;
				if (!(c.s && (s.srv && !s.srvRO)) && !c.l)
					return;
				$scope.source = c.s && (s.srv && !s.srvRO) ? c.s : c.l;
				$scope.nvArch = c.s && (s.srv && !s.srvRO) ? c.s.archive : c.l.archive;
				$scope.nvPub = c.s && (s.srv && !s.srvRO) ? c.s.pub : false;
				$scope.setDisableAP();
				$scope.panelOn("changerAP");
			}

			$scope.setDisableAP = function() {
				$scope.idem = $scope.nvArch == $scope.source.archive && 
					(!Secrets.carnet.courant.s || (Secrets.carnet.courant.s && $scope.nvPub == Secrets.carnet.courant.s.pub));
				$scope.disable = $scope.idem;
			}
			
			$scope.changerAP = function() {
				if (!$scope.disable) 
					Secrets.changerAP($scope.nvArch, $scope.nvPub, Secrets.panelOff);
			}
			
			/*************************************************/
			$scope.clonerCarnet = function(){
				$scope.ncNom = "";
				$scope.ncCle = "";
				$scope.ncCle2 = "";
				$scope.ncPhrase = "";
				$scope.changeNcNom();
				$scope.changeNcPhrase();
				$scope.panelOn("cloner");
			}
			
			$scope.setDisableCL = function(){
				$scope.idem = !$scope.ncNom && !$scope.ncCle && !$scope.ncCle2 && !$scope.ncPhrase;
				$scope.disable = $scope.idem || $scope.ncNomErr || $scope.ncCleErr || $scope.ncPhraseErr 
					|| $scope.ncCle != $scope.ncCle2;
			}

			$scope.changeNcNom = function(){
				var n = $scope.ncNom;
				if (!n) {
					$scope.ncNomErr = false;
					$scope.ncNomDiag = "Le nom du carnet est requis (lettres majuscules / minuscules, chiffres, points seulement)";
				} else {
					if (!n.match(Secrets.regExpId)) {
						$scope.ncNomErr = true;
						$scope.ncNomDiag = "Un pseudo ne peut contenir que des lettres majuscules / minuscules, des chiffres et des points";
					} else {
						$scope.ncNomErr = false;
						for(var k in Secrets.dir){
							var e = Secrets.dir[k];
							if (e.name == n)
								$scope.ncNomErr = true;
						}
						$scope.ncNomDiag = $scope.ncNomErr ? "Un carnet porte déjà ce nom" : "";
					}
				}
				$scope.setDisableCL();
			}

			$scope.changeNcCle = function(){
				$scope.ncCleErr = $scope.ncCle.length < 8;
				$scope.setDisableCL();
			}

			$scope.changeNcPhrase = function(){
				$scope.ncPhraseErr = $scope.ncPhrase.length < 8;
				$scope.setDisableCL();
			}

			$scope.cloner = function(){
				Secrets.cloner($scope.ncNom, $scope.ncPhrase, $scope.ncCle, Secrets.panelOff);
			}
			
			/*****************************************/			
			$scope.supprimerC = function(){
				var sc = Secrets.setSupprCond();
				$scope.sLoc = sc.sLoc;
				$scope.sLocD = sc.sLocD;
				$scope.sSrv = sc.Srv;
				$scope.sSrvD = sc.SrvD;
				$scope.supprLoc = false;
				$scope.supprSrv = false;
				$scope.panelOn("supprimer");
			}
			
			$scope.supprimer = function(){
				Secrets.supprimer($scope.supprLocal, $scope.supprSrv, Secrets.panelOff);
			}
						
			/*****************************************/
			$scope.exporterC = function(){
				var c = $scope.carnet.courant;
				if (c.l && c.s){
					$scope.exportLocal = true;
					$scope.exportSrv = !c.egaux;
				} else {
					$scope.exportLocal = c.l ;
					$scope.exportSrv = c.s ;
				}
				$scope.panelOn("exporter");
			}
			
			$scope.exporter = function(srv){
				Secrets.exporter(srv, Secrets.panelOff);
			}
			
			/****************************************/

}]);
