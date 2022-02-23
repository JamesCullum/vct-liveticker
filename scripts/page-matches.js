
const routeStatus = {"upcoming": 0, "live": 1, "results": 2}
const routeLabel = {"upcoming": "Upcoming matches", "live": "Live matches", "results": "Finished matches"}
const pathData = window.location.pathname.split("/").pop()
console.log("matches", pathData)
if(!(pathData in routeStatus)) pathData = "live"
const selectedStatus = routeStatus[pathData]

const matchList = $(".match-list-item").clone()
$(".match-list-title", matchList).text(routeLabel[pathData])
$(".body-container").append(matchList)

let paginationCache = {first: false, last: false, i: 0}
loadMatchPage()

function loadMatchPage(moveForward) {
	if(typeof moveForward == 'undefined') moveForward = true
	paginationCache.i = paginationCache.i + (moveForward ? 1 : -1)
	
	const pageSize = 3
	let query = db.collection("matches").where("status", "==", selectedStatus)
	
	if(selectedStatus < 2) {
		query = query.orderBy("date", "asc")
	} else {
		query = query.orderBy("date", "desc")
	}
	
	if(moveForward && paginationCache.last !== false) {
		query = query.startAfter(paginationCache.last).limit(pageSize)
	} else if(!moveForward && paginationCache.first !== false) {
		query = query.endBefore(paginationCache.first).limitToLast(pageSize)
	} else {
		query = query.limit(pageSize)
	}
	
	query.get().then(querySnapshot => {
		$("#loader").remove()
		
		if(paginationCache.i == 1 && !querySnapshot.size) {
			return $(".match-list-container").append(`<div class="alert alert-primary alert-downtime">
				<h3>There appears to be some downtime!</h3>
				<p>Check <a href="https://www.vlr.gg/" target="_blank" rel="noopener noreferrer">vlr.gg</a> to see if it's Riots schedule or our servers.</p>
			</div>`)
		}
		
		if(querySnapshot.size) {
			paginationCache.first = querySnapshot.docs[0]
			paginationCache.last = querySnapshot.docs[querySnapshot.size - 1]
		}
		
		querySnapshot.forEach(doc => {
			const thisMatchItem = getMatchItem(doc.data(), {
				eventTitle: true,
			})
			$(".match-list-container").append(thisMatchItem)
		})
		
		const loadBtn = $(".pagination-bar")
		if(querySnapshot.size < pageSize) {
			loadBtn.remove()
		} else {
			loadBtn.removeClass("d-none")
		}
		
		sortBySubscription(".match-list-container", ".match-item")
	})
}

$("body").on("click", ".pagination-forward", function(evt) {
	loadMatchPage()
})
