var secretsApp = angular.module("secretsApp", ["admin", "carnets"])

/***************************************************/
secretsApp.filter('edt', function() { return function(t) { return Util.edt(t);};});
secretsApp.filter('edf', function() {return function(f) { return Util.edf(f); };});
secretsApp.filter('ednbx', function() {return function(n, mot) { return Util.ednbx(n, mot); };});
/***************************************************/
// This directive allows us to pass a function in on an enter key to do what we want. /x
secretsApp.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter);
                });
                event.preventDefault();
            }
        });
    };
});

/***************************************************/
secretsApp.directive('appMessage', ["$timeout" , function($timeout) {
    return {
	      restrict: 'E',
	      scope: {},
	      replace: true,
	      templateUrl: templ_app_message,
	      link : function($scope, element, attrs) {
	    	  $scope.nmsg = 0;
    		  $scope.refAide = null;

	    	  $scope.$on('secrets-message', function(event, data) {
	    		  $scope.nmsg++;
	    		  $scope.info = data.info;
	    		  $scope.texte = data.texte;
	    		  $scope.refAide = data.refAide;
	    		  $timeout(function(){
	    			  $scope.messageTop = "1rem";
	    		  }, 50);
	    		  var n = $scope.nmsg;
	    		  $timeout(function(){
	    			  $scope.messageHide(n);
	    		  }, data.info ? 3000 : 8000);
	    	  });

	    	  $scope.messageHide = function(n){
	    		  if (n && n != $scope.nmsg)
	    			  return;
	    		  $scope.messageTop = "-6rem";
	    		  $scope.refAide = null;
	    	  }
	      }
    };
}]);

/***************************************************/
secretsApp.directive('appAide', ["$timeout", function($timeout) {
    return {
	      restrict: 'E',
	      scope: {},
	      replace: true,
	      templateUrl: templ_app_aide,
	      link : function($scope, element, attrs) {
	    	  $scope.aideRef = null;
	    	  $scope.aideTexte = null;
	    	  $scope.aideRight = "-900px";
	    	  var ifra = element.find("iframe");
	    	  ifra.attr("src", "/aide/aide_" + version_aide + ".html");
	    	  
	    	  ifra.bind("load", function(event) {
	    		  var ifr = event.currentTarget;
		    	  $scope.aideDoc = ifr.contentDocument || contentWindow.document;
		    	  $scope.aideWin = ifr.contentWindow;
		    	  var elt = $scope.aideDoc.getElementById("version");
		    	  if (elt)
		    		  elt.innerHTML = version_secrets;
		    	  elt = $scope.aideDoc.getElementById("versionA");
		    	  if (elt)
		    		  elt.innerHTML = version_secrets;
	    	  });
	    	  
	    	  $scope.$on('secrets-aide', function(event, data) {
	    		  $timeout(function(){
		    		  if (data.estRef) {
		    			  $scope.aideRef = data.arg;
		    			  $scope.aideTexte = null;
	 	    		  } else {
		    			  $scope.aideRef = null;
		    			  $scope.aideTexte = data.arg;
		    		  }
	    			  $timeout(function(){
	    				  $scope.aideRight = "0";
		    			  if (data.estRef) {
		    				  var elt = $scope.aideDoc.getElementById($scope.aideRef);
		    				  var top = elt ? elt.offsetTop : $scope.aideDoc.getElementById("encours").offsetTop;
			    			  $timeout(function(){
			    				  $scope.aideWin.scrollTo(0, top - 30);
			    			  }, 50);
		    			  }
	    			  }, 50);
	    		  }, 50);
	    	  });

	    	  $scope.fermerAide = function(){
	    		  $scope.aideRight = "-900px";
	    		  $timeout(function(){
	    			  $scope.aideRef = null;
	    			  $scope.aideTexte = null;
	    		  }, 400);
	    	  }
	      }
	  };
  }]);

/***************************************************/
secretsApp.directive('btnAide', function() {
    return {
	      restrict: 'E',
	      template: '<div class="btn-aide">?</div>',
	      link : function($scope, element, attrs) {
	    	  element.bind('click', function(event) {
	    		  event.stopPropagation();
	    		  var ref = attrs.ref;
	    		  if (!ref.startsWith("$"))
	    			  ref = "" + $scope.$eval(attrs.ref);
	    		  if (!ref.startsWith("$"))
	    			  Secrets.showAide({arg:ref, estRef:true});
	    		  else
	    			  Secrets.showAide({arg:ref.substring(1), estRef:false});
 	    	  });
	      }
	  };
  });

/***************************************************/
secretsApp.directive('cbEc', function() {
    return {
    	restrict: 'E',
	    scope: { texte: "@", model:"=" },
	    template: "<div><input class='cb1' type='checkbox' ng-model='model'>"
	    	+ "<div class='cb1-label'>{{texte}}</div></div>"
	};
  });

/***************************************************/
secretsApp.directive('appSpinner', ["$timeout", function($timeout) {
    return {
	      restrict: 'E',
	      scope: {},
	      replace: true,
	      templateUrl: templ_app_spinner,
	      link : function($scope, element, attrs) {
	    	  $scope.masque = false;
	    	  $scope.opacityMasque = 0.;

	    	  $scope.$on('secrets-spinnerOn', function(event, data) {
	    		  if (Serveur.numOff && data.num <= Serveur.numOff)
	    			  return;
	    		  $scope.masque = true;
	    		  $scope.mot1 = $timeout(function(){
	    			  $scope.opacityMasque = 1.;
	    			  $scope.mot1 = null;
	    		  }, 1000);
	    	  });

	    	  $scope.$on('secrets-spinnerOff', function(event, data) { $scope.spinnerOff(data.num); });
	    	  
	    	  $scope.spinnerOff = function(num){
	    		  Serveur.numOff = num;
	    		  if ($scope.mot1)
	    			  $timeout.cancel($scope.mot1);
	    		  $scope.masque = false;
	    		  $scope.opacityMasque = 0.;   		  
	    	  };
	    	  
	    	  $scope.stop = function(){
	    		  Secrets.afficheErreur(499);
	    		  $scope.spinnerOff();
	    	  };

	      }
    }
   }]);

/***************************************************/
secretsApp.directive('panelChangerpin', function() {
    return {
	      restrict: 'E',
	      scope: true,
	      templateUrl: templ_panel_changerPin,
	      link : function($scope, element, attrs) {
	    	  $scope.$on('changerPIN', function(event, data) {
    				$scope.nvPIN2 = "";
    				$scope.md5PIN2 = "";
    				$scope.nvPIN = "";
    				$scope.md5PIN = "";
    				$scope.svPIN = Secrets.session.svPIN;
    				$scope.changePIN();
    			});

	    	  	$scope.setDisableCP = function() {
	    	  		$scope.err = !$scope.md5PINInput || $scope.md5PINInput != $scope.md5PINInput2;
	    	  		$scope.idem = $scope.md5PINInput == Secrets.session.md5PIN
	    	  		&& ((Secrets.session.svIdent && Secrets.session.svPIN == $scope.svPIN)
	    	  				|| !Secrets.session.svIdent);
	    	  		$scope.disable = $scope.idem || $scope.err;
	    	  	}
	    	  	
	    		$scope.changePIN = function(){
	    			var p = $scope.nvPIN;
	    			$scope.md5PINInput = p ? Util.md5(p) : "";
	    			$scope.setDisableCP();
	    		}
	    			
	    		$scope.changePIN2 = function(){
	    			var p = $scope.nvPIN2;
	    			$scope.md5PINInput2 = p ? Util.md5(p) : "";
	    			$scope.setDisableCP();
	    		}

	    		$scope.changerPIN = function() {
	    			if (!$scope.disable) {
		    			Serveur.book(function(data){
		    				$scope.panelOff(function(){
		    					if (Secrets.session.svIdent)
		    						Local.saveIdent(Secrets.session.ident, $scope.svPIN ? $scope.md5PINInput : null);
		    					Secrets.setIdent(Secrets.session.ident, $scope.md5PINInput);
		    				});
		    			}, null, 12, Secrets.session.ident, Secrets.session.md5PIN, null, $scope.md5PINInput);
	    			}
	    		}
	      }
    };
});

/***************************************************/
secretsApp.directive('panelChangerici', function($log) {
    return {
	      restrict: 'E',
	      scope: true,
	      templateUrl: templ_panel_changerIci,
	      link : function($scope, element, attrs) {
	    	  $scope.$on('changerIci', function(event, data) {
	    		  $scope.nvIci = Secrets.session.ici;
	    		  if (Secrets.session.ici)
	    			  $scope.changeIci();
	    	  });

	    	  $scope.changeIci = function() {
	    		  $scope.idDiag = "";
	    		  if (!$scope.nvIci) {
	    			  $scope.idDiag = "Un nom est requis (16 lettres majuscules / minuscules (a-z), " 
	    				  + "chiffres, point, tiret, slash seulement)";
	    		  } else {
	    			  if (!$scope.nvIci.match(Secrets.regExpIci) || $scope.nvIci.length > 16)
	    				  $scope.idDiag = "Un nom ne peut contenir que des lettres majuscules / minuscules (a-z), "
	    					  + "des chiffres et des point, tiret, slash (16 au plus)";
	    		  }
	    		  $scope.idem = $scope.nvIci == Secrets.session.ici;
	    		  $scope.disable = $scope.idem || $scope.idDiag;
	    	  }

	    	  $scope.changerIci = function() {
	    		  Secrets.setIci($scope.nvIci);
	    		  $scope.panelOff();
	    	  }
	    	  
	    	  $scope.resetIci = function() {
	    		  var b = window.confirm("Attention : confirmer l'effacement du stockage local ou annuler.");
	    		  if (b)
	    			  Secrets.setIci("");
	    		  $scope.panelOff();
	    	  }

	      }
    };
});

/***************************************************/
secretsApp.directive('panelChangerident', function() {
    return {
	      restrict: 'E',
	      scope: true,
	      templateUrl: templ_panel_changerIdent,
	      link : function($scope, element, attrs) {
	    	  	$scope.$on('changerIdent', function(event, data) {
	  			$scope.disable = true;
	  			$scope.nvIdent = Secrets.session.ident;
				$scope.svIdent = Secrets.session.svIdent;
				$scope.changeIdent();
	    		$scope.nvPIN = "";
	    		$scope.svPIN = Secrets.session.svPIN;
	    		$scope.md5PINInput = "";
	    		$scope.changePIN();
	    	  });
	    	  
	    	  $scope.setDisableCI = function(){
    			  $scope.idem = $scope.nvIdent == Secrets.session.ident && $scope.nvPIN == "" 
    				  && ($scope.svIdent == Secrets.session.svIdent)
    				  && ($scope.svPIN == Secrets.session.svPIN);
				  $scope.disable = $scope.idDiag || $scope.idem;
	    	  };

	    	  $scope.changePIN = function(){
	    		  var p = $scope.nvPIN;
	    		  $scope.md5PINInput = p ? Util.md5(p) : "";
	    		  $scope.setDisableCI();
	    	  };
			
	    	  $scope.changeIdent = function(){
	    		  var id = $scope.nvIdent;
	    		  $scope.idDiag = "";
	    		  if (!id) {
	    			  if (!Secrets.session.ident)
		    			  $scope.idDiag = "Un pseudo est requis (lettres majuscules / minuscules, " 
		    				  + "chiffres, points seulement)";
	    		  } else {
	    			  if (!id.match(Secrets.regExpId))
	    				  $scope.idDiag = "Un pseudo ne peut contenir que des lettres majuscules / minuscules, des chiffres et des points";
	    		  }
	    		  $scope.setDisableCI();
	    	  }
			
	    	  $scope.changerIdent = function() {
	    		  if (!$scope.disable) {
	    			  var chg = $scope.nvIdent != Secrets.session.ident;
	    			  if ($scope.svIdent)
	    				  Local.saveIdent($scope.nvIdent, $scope.svPIN && $scope.nvPIN ? $scope.md5PINInput : null);
	    			  else
	    				  Local.saveIdent(null, null);
	    			  Secrets.setIdent($scope.nvIdent, $scope.nvPIN ? $scope.md5PINInput : null);
	    			  $scope.panelOff(function(){
	    				  if (chg)
	    					  Secrets.setLocation1();
	    			  });
	    		  }
	    	  }
	      }
    };
});

/***************************************************/
secretsApp.controller("secretsCtrl", ["$scope", "$timeout", function ($scope, $timeout) {
		Secrets.session.appUrlRoot = "/a/app";

		Secrets.showAide = function(arg){
			// Util.log(arg.arg + " : " + arg.estRef);
			$timeout(function(){$scope.$broadcast("secrets-aide", arg);});
		}

		Secrets.spinnerOn = function(data){
			$timeout(function(){$scope.$broadcast("secrets-spinnerOn", data);});
		}

		Secrets.spinnerOff = function(data){
			$timeout(function(){$scope.$broadcast("secrets-spinnerOff", data);});
		}

		Secrets.messageShow = function(texte, info, refAide){
			var d = {texte: texte, info:info, refAide : refAide ? refAide : null};
			$timeout(function(){$scope.$broadcast("secrets-message", d);});
		}

		Secrets.vueOn = function(nomVue){
			$timeout(function(){$scope.$broadcast("secrets-vue", {nomVue:nomVue});});
		}

		Secrets.panelOn = function(panel, delai){
			Secrets.session.panel = panel;
			$timeout(function(){
				$scope.$broadcast(panel);
				$timeout(function(){
					Secrets.session.panelleft = "0";
				});
			}, delai ? delai : 0)
		}
		$scope.panelOn = Secrets.panelOn;

		Secrets.panelOff = function(onClose){
			Secrets.session.panelleft = "-60%";
			$timeout(function(){
				Secrets.session.panel = null;
				if (onClose)
					onClose();
			}, 300)
		}
		$scope.panelOff = Secrets.panelOff;
		
		$scope.setLocation1 = Secrets.setLocation1;
		$scope.quitter = Secrets.quitter;
    	$scope.connecter = Serveur.connecter;
    	$scope.sync = Secrets.sync;

		$scope.session = Secrets.session;
		$scope.dir = Secrets.dir1;
		$scope.secrets1 = Secrets.secrets1;
		$scope.carnet = Secrets.carnet;
		$scope.prefixes = Secrets.prefixes;
		$scope.carnets = Secrets.carnets;
		$scope.prefixe = Secrets.prefixe;
		
		$scope.opacity = 0;
		$scope.nomvue = "";
		
		$scope.$on('secrets-vue', function (event, data) {
			var vue = data.nomVue;
			if (!$scope.nomvue){
				$scope.nomvue = vue;
				$scope.opacity = 1.;
			} else {
				$scope.opacity = 0.;
				$timeout(function(){
					$scope.nomvue = vue;
					$timeout(function(){
						$scope.opacity = 1.;
					}, 50)
				}, 500);
			}
		});

		$timeout(Secrets.init, 100);
}]);