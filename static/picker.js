var SmartPicker = (function() {

	// config params (can be passed to init function or via qs):
	var defaults = {
		// server url for displaying patients
		openServerUrl: "./api/fhir", //"https://fhir-open-api-dstu2.smarthealthit.org",
		// server url for launching
		apiGatewayUrl: "https://stub-dstu2.smarthealthit.org/api/fhir",
		// app launch url
		launchUrl: "", //"https://fhir-dstu2.smarthealthit.org/apps/bp-centiles/launch.html",
		// comma delimited list of pt ids to limit list - if just one won't show picker
		limitIds: "",
		// launch app without a patient (eg. pop health apps)
		skipPicker: "0", 
		// patients shown per page
		pageSize: "10",
		// launch app in new window (default is to replace picker)
		newWindow: "0",
		// show resource id next to pt name (in this mode launching requires clicking the select button)
		showIds: "0",
		// default sort param
		sortParam: "name", 
		//default sort dir
		sortDir: "asc"    
	};

	var state = {
		skip: "0",
		searchText: "",
		mode: "loading"
	};

	var getQsParams = function() {
		//fix keys with underscores instead of camelcase
		_parseKey = function(key) {
			if (key.indexOf("_") == -1) {
				return key;
			} else {
				return (_.map(key.toLowerCase().split("_"), function(seg, i) {
					return (i == 0 ? seg[0] : seg[0].toUpperCase()) + seg.slice(1);
				})).join("")
			};
		}
		var query = ((window.location.search).substring(1) || "");
		return _
			.chain(query.split('&'))
			.map(function(params) {
				var p = params.split('=');
				return [_parseKey(p[0]), decodeURIComponent(p[1])];
			}).object().value();
	}

	// UI Event Handlers
	var bindUiEvents = function() {
		$("#paging-next, #paging-previous").click(handlePagingClick);
		$("th").click(handleHeaderClick);
		$("#search-form").submit(handleSearchSubmit);
		$("table").on("click", ".patient", handlePatientClick);
		$("#search-text").focus()
	}

	var handlePagingClick = function() {
		var dir = 1;
		if ($(this).attr("id") == "paging-previous")
			dir = -1;
		state.skip = "" + (parseInt(state.skip) + parseInt(state.pageSize) * dir);
		loadFhir()
	}

	var handleHeaderClick = function() {
		var sortParam = $(this).attr("id").split("-")[2];
		if (sortParam == state.sortParam) {
			state.sortDir = (state.sortDir == "asc") ? "desc" : "asc";
		} else {
			state.sortDir = "asc"
			state.sortParam = sortParam;
		}
		state.skip = 0;
		loadFhir();
	}

	var handleSearchSubmit = function(e) {
		e.preventDefault();
		state.searchText = $("#search-text").val();
		loadFhir();
	}

	var handlePatientClick = function(e) {
		if (state.launchUrl == "") return;

		var patientId = $(this).attr("id").replace("patient-", "");
		if (state.showIds != "1" || e.target.tagName == "BUTTON") {
			launchApp(patientId);
		}
	}

	// AJAX
	var buildFhirUrl = function() {
		var sortParam = state.sortParam;
		var sortDir = state.sortDir;

		if (sortParam == "age") {
			sortParam = "birthdate"
			sortDir = (sortDir == "asc") ? "desc" : "asc";
		} else if (sortParam == "name") {
			sortParam = "family"
		}

		return state.openServerUrl + 
			"/Patient/?_format=application/json+fhir" +
			"&_summary=true&elements=name,gender,birthDate" +
			"&_count=" + state.pageSize +
			"&_skip=" + state.skip + 
			//"&gender:missing=false&birthdate:missing=false&name:missing=false" +
			(state.limitIds ? "&_id=" + state.limitIds.replace(/\s*/g, "") : "") + 
			(sortParam ? "&_sort:" + sortDir + "=" + sortParam : "") +
			(state.searchText != "" ? "&name:contains=" + encodeURIComponent(state.searchText) : "");
	}

	var loadFhir = function() {
		var fhirUrl = buildFhirUrl();
		state.mode = "loading";
		render();
		$.get(fhirUrl)
			.done( function(data) {
				state.data = data;
				state.mode = "data"
				render();
			})
			.fail(function() {
				state.mode = "error"
				render();
			});
	}

	// Launcher
	var launchApp = function(patientId) {
		var launchId = btoa(JSON.stringify({typ:"JWT", alg: "none"})) + "." + btoa(JSON.stringify({
			"patient": patientId,
			"need_patient_banner": true,
			"smart_style_url": "https://gallery-styles.smarthealthit.org/styles/v1.2.12"
		}))  + ".";
		var url = state.launchUrl+"?launch=" +
			encodeURIComponent(launchId)+"&iss=" +
			encodeURIComponent(state.apiGatewayUrl);

		if (state.newWindow == "1") {
			window.open(url);
		} else {
			window.location.href = url;
		}
	}

	// Renderer Helpers
	var buildPatientRow =  function(patient, tpl, showIds, hideButton) {
		return tpl
			.replace("{id}", patient.id)
			.replace("{name}", formatName(patient, showIds))
			.replace("{showButton}", hideButton ? "none" : "inline")
			.replace("{gender}", formatGender(patient))
			.replace("{age}", formatAge(patient))
	}

	var formatAge = function(patient) {
		var dob = patient.birthDate;
		if (!dob) return "";
		
		//fix year or year-month style dates 
		if (/\d{4}$/.test(dob))
			dob = dob + "-01";
		if (/\d{4}-d{2}$/.test(dob))
			dob = dob + "-01"

		return moment(dob).fromNow(true)
			.replace("a ", "1 ")
			.replace(/minutes?/, "min");
	}

	var formatGender = function(patient) {
		var gender = patient.gender || "unknown";
		return gender[0].toUpperCase();
	}

	var formatName = function(patient, showIds) {
		var name = patient.name && patient.name[0];
		if (!name) name = {family: ["No Name Listed"]};

		return (name.family ? name.family.join(" ") : "") +
			   (name.family && name.given ? ", " : "") +
			   (name.given ? name.given.join(" ") : "") + 
			   (showIds ? " [" + patient.id + "]" :  "")
	}

	// Renderer
	var render = function() {
		var _renderError = function() {
			if (state.errorMessage) $("#global-error-message").text(message);
			$(".picker").hide()
			$("#global-error").show()
		}

		var _renderTableSortIndicators = function() {
			$(".col-sort-ind").hide();
			$("#col-header-" + state.sortParam + " .col-sort-ind-" + state.sortDir).show();	
		}

		var _renderLoading = function() {
			$(".patient").remove();	
			$("#paging, #message-no-patients").hide();
			$("#message-loading").show();
		}

		var _renderNoPatients = function() {
			$("#message-loading").hide();
			$("#message-no-patients").show();
		}

		var _renderPatients = function() {
			var tpl = $("#patient-row-template").html();
			patientRows = _.map(state.data.entry, function(entry) {
				return buildPatientRow(entry.resource, tpl, state.showIds == "1", state.launchUrl == "")
			});
			$(".picker table > tbody").prepend(patientRows.join(""))
			$("#message-loading").hide();
		}

		var _renderPaging = function() {
			$("#paging-from").text(parseInt(state.skip)+1);
			$("#paging-to").text(state.data.entry.length);
			$("#paging-total").text(state.data.total);
			$("#paging-next").toggle(state.data.total > parseInt(state.skip) + state.data.entry.length);
			$("#paging-previous").toggle(parseInt(state.skip) > 0);
			$("#paging").show();
		}

		_renderTableSortIndicators();
		if (state.mode == "error") {
			_renderError();
		} else if (state.mode == "loading") {
			_renderLoading();
		} else if (state.data.entry && state.data.entry.length) {
			_renderPatients();
			_renderPaging();
		} else {
			_renderNoPatients();
		}

	}

	return {
		init: function(config) {
			state = _.extend(state, defaults, config, getQsParams());
			//single id - launch with it
			if (state.limitIds != "" && state.limitIds.indexOf(",") == -1) {
				launchApp(state.limitIds)
			//pop health - skip picker
			} else if (state.skipPicker == "1") {
				launchApp("")
			//show picker
			} else {
				bindUiEvents();
				$(".container").show()
				loadFhir();
			}
		}
	}

})();









