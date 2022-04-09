const filterList = [{label: "Global", filter:["Masters"]}, "EMEA", "Latin America", "Philippines", "North America", "Thailand", "Brazil", "Korea", "Japan"]
const filterListLookup = {"Global": 0}
db.collection("events").doc("current").onSnapshot(doc => {
	const docData = doc.data()
	delete docData._updated
	
	const events = Object.entries(docData);
	$("#event-list").html("")
	
	events.sort((a, b) => {
		return b[0] < a[0] ? 1 : -1;
	})
	
	if(!events.length) {
		return $("#event-list").append(`<div class="alert alert-primary alert-downtime">
			<h3>There appears to be some downtime!</h3>
			<p>Check <a href="https://www.vlr.gg/" target="_blank" rel="noopener noreferrer">vlr.gg</a> to see if it's Riots schedule or our servers.</p>
		</div>`)
	}
	
	for (let [name, matchInventory] of events) {
		const thisEventItem = $("#template-elements > .event-item").clone()
		$(".event-container", thisEventItem).attr("data-subscription-type", "events").attr("data-subscription-label", name)
		$(".event-name", thisEventItem).text(name)
		
		const matchDataList = []
		if(1 in matchInventory) matchDataList.push(...matchInventory[1])
			
		const notLiveEvents = []
		if(0 in matchInventory) notLiveEvents.push(...matchInventory[0])
		if(2 in matchInventory) notLiveEvents.push(...matchInventory[2])
		
		const now = new Date()
		notLiveEvents.sort((a, b) => {
			const aDateDiff = Math.abs(now - a.date.toDate())
			const bDateDiff = Math.abs(now - b.date.toDate())
			return aDateDiff > bDateDiff ? 1 : -1
		})
		matchDataList.push(...notLiveEvents)
		
		// debugging
		/*while(matchDataList.length > 0 && matchDataList.length < 6) {
			matchDataList.push(...matchDataList)
		}*/
		
		for (let matchData of matchDataList) {		
			const thisMatchItem = getMatchItem(matchData)
			$(".match-list-container", thisEventItem).append(thisMatchItem)
		}
		
		$("#event-list").append(thisEventItem)
	}
	
	// Filter, based on results from Champions 21
	// https://liquipedia.net/valorant/VALORANT_Champions_Tour/2021/Champions
	$("#event-list").prepend(`<div class="row"><div class="event-filter-list mb-2"></div></div>`)
	for(const filterVal of filterList) {
		let thisLabel;
		const filterValType = typeof filterVal;
		if(filterValType === "string") {
			thisLabel = filterVal
		} else if(filterValType === "object" && "label" in filterVal) {
			thisLabel = filterVal.label
		}
		
		$(".event-filter-list").append(`<button type="button" class="btn btn-secondary btn-sm">`+thisLabel+`</button>`)
	}
	
	loadFilters()
	applyFilters()
	
	sortBySubscription("#event-list", ".event-item", ".event-title-bar", () => {
		sortBySubscription("#event-list .match-list-container", ".match-item", ".card-footer", () => {
			limitExpandItems("#event-list .match-list-container", ".match-item", 3)
			
			subscriptionUpdateUI()
		})
	})
})

$("body").on("click", ".event-filter-list .btn", function(evt) {
	const label = $(this).text()
	
	if($(this).hasClass("btn-primary")) {
		filters = removeItemOnce(filters, label)
	} else {
		filters.push(label)
	}
	
	applyFilters()
	saveFilters()
})

window.filters = []
window.filtersLoaded = false
function loadFilters() {
	if(filtersLoaded) return true
	filtersLoaded = true
	
	if(localStorage.getItem("evt-filters")) {
		filters = JSON.parse(localStorage.getItem("evt-filters"))
	}
}

function saveFilters() {
	localStorage.setItem("evt-filters", JSON.stringify(filters))
}

function filterContains(label) {
	if(!label) return false
	
	for(const filterVal of filters) {
		if(filterVal in filterListLookup) {
			// Advanced filters
			for(const subFilterVal of filterList[filterListLookup[filterVal]].filter) {
				if(label.indexOf(subFilterVal) != -1) return true
			}
		} else {
			// Normal filters
			if(label.indexOf(filterVal) != -1) return true
		}
	}
	return false
}

function applyFilters() {
	const evtSel = $('.event-item')
	const btnSel = $(".event-filter-list .btn")
	
	evtSel.removeClass("d-none")
	btnSel.removeClass("btn-primary").addClass("btn-secondary")
	if(!filters.length) return true
	
	evtSel.each(function() {
		const label = $(".event-container", this).attr("data-subscription-label")
		if(!filterContains(label)) $(this).addClass("d-none")
	})
	btnSel.each(function() {
		const label = $(this).text()
		
		for(const filterVal of filters) {
			const filterValType = typeof filterVal;
			if((filterValType === "string" && label == filterVal) ||
				(filterValType === "object" && "label" in filterVal && label == filterVal.label)) {
				$(this).removeClass("btn-secondary").addClass("btn-primary")
			}
		}
	})
}



