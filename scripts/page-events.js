
db.collection("events").doc("current").get().then(doc => {
	const events = Object.entries(doc.data());
	
	if(!events.length) {
		return $("#event-list").append(`<div class="alert alert-primary">
			<h3>There appears to be some downtime!</h3>
			<p>Check <a href="https://www.vlr.gg/" target="_blank" rel="noopener noreferrer">vlr.gg</a> to see if it's Riot or us.</p>
		</div>`)
	}
	
	events.sort(([aName, aVal], [bName, bVal]) => {
		return bName < aName;
	})
	
	for (let [name, matchInventory] of events) {
		if(name == "_updated") continue
		
		const thisEventItem = $("#template-elements > .event-item").clone()
		$(".event-container", thisEventItem).attr("data-subscription-type", "events").attr("data-subscription-label", name)
		$(".event-name", thisEventItem).text(name)
		
		const matchDataList = []
		if(1 in matchInventory) matchDataList.push(...matchInventory[1])
		if(0 in matchInventory) matchDataList.push(...matchInventory[0])
		if(2 in matchInventory) matchDataList.push(...matchInventory[2])
		
		// debugging
		/*while(matchDataList.length > 0 && matchDataList.length < 6) {
			matchDataList.push(...matchDataList)
		}*/
		
		for (let matchData of matchDataList) {		
			const thisMatchItem = getMatchItem(matchData)
			thisEventItem.append(thisMatchItem)
		}
		
		$("#event-list").append(thisEventItem)
	}
	
	sortBySubscription("#event-list", ".event-item")
	sortBySubscription(".event-item", ".match-item", () => {
		limitExpandItems(".event-item", ".match-item", 3)
	})
	
})

