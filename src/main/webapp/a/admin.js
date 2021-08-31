var admin = angular.module('admin', []);

admin.controller("adminCtrl", ["$scope", "$timeout", function ($scope, $timeout) {
		
		$scope.nouveauPrefixe = function() {
			$scope.nvIdent = "";
			$scope.nvPIN = "";
			$scope.md5PIN = "";
			$scope.changeCreer();
			$scope.panelOn("creerIdent");
		}
		
		$scope.setDisableACI = function(){
			$scope.idem = !$scope.nvIdent;
			$scope.disable = $scope.idem || !$scope.md5PIN || $scope.idDiag;
		}
		
		$scope.changeSource = function(){
			if ($scope.source){
				$scope.idDiag2 = "Pseudo source inconnu";
				for(var i = 0, x = null; x = $scope.prefixes[i]; i++){
					if (x.name == $scope.source){
						$scope.idDiag2 = "";
						break
					}
				}
			} else
				$scope.idDiag2 = "";
			$scope.setDisableACI();
		}

		$scope.changeCreer = function(){
			var id = $scope.nvIdent;
			if (!id) {
				$scope.idDiagErr = false;
				$scope.idDiag = "Un pseudo est requis (lettres majuscules / minuscules, chiffres, points seulement)";
			} else {
				if (!id.match(Secrets.regExpId)) {
					$scope.idDiagErr = true;
					$scope.idDiag = "Un pseudo ne peut contenir que des lettres majuscules / minuscules, des chiffres et des points";
				} else {
					var exist = false;
					for(var i = 0, x = null; x = $scope.prefixes[i]; i++)
						if (x.name == id) exist = true;
					if (exist){
						$scope.idDiagErr = true;
						$scope.idDiag = "Ce pseudo existe déjà";						
					} else {
						$scope.idDiagErr = false;
						$scope.idDiag = "";
					}
				}
			}
			var p = $scope.nvPIN;
			if (p)
				$scope.md5PIN = p.length == 32 && p.match(Secrets.regExpHexa) ? p : Util.md5(p);
			else
				$scope.md5PIN = "";
			$scope.setDisableACI();
		}
		
		$scope.listerIdents = function(){
			Serveur.listerIdents();
		}
	
		$scope.creerIdent = function() {
			if (!$scope.disable) {
				Serveur.admin(function(data){
					$scope.panelOff();
					Secrets.messageShow("Pseudo [" + $scope.nvIdent + "] créé avec succès", true);
					$timeout(function(){
						Serveur.listerIdents();
					}, 500)
				}, null, 2, $scope.nvIdent, $scope.md5PIN, null, $scope.source);
			}
		},
		
		$scope.clickIdent = function(ident){ Secrets.setLocationA2(ident); }
	
}]);

admin.controller("adminIdCtrl", 
	["$scope", "$log", "$window", "$timeout",  "$location",
    function ($scope, $log, $window, $timeout,  $location) {

		$scope.backIdents = Secrets.setLocationA;

		$scope.supprPrefixe = Serveur.supprPrefixe;
		
		$scope.supprCarnet = Serveur.supprCarnet;
		
		/******************************************/
		$scope.editerPIN = function(){
			$scope.nvPIN2 = "";
			$scope.md5PIN2 = "";
			$scope.changePIN();
			$scope.panelOn("changerPIN");
		}

		$scope.changePIN = function(){
			var p = $scope.nvPIN2;
			if (p)
				$scope.md5PIN2 = p.length == 32 && p.match(Secrets.regExpHexa) ? p : Util.md5(p);
			else
				$scope.md5PIN2 = "";
			$scope.disable = !$scope.md5PIN2;
		}

		$scope.changerPIN = function() {
			if (!$scope.disable) {
				Serveur.admin(function(data){
					Secrets.messageShow("Code PIN de [" + $scope.session.ident + "] changé avec succès", true);
					$scope.panelOff();
				}, null, 2, $scope.session.ident, $scope.md5PIN2);
			}
		}

}]);
