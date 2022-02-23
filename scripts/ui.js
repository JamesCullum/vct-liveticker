const statusLookup = {0: "Upcoming", 1: "Live", 2: "Finished"}
const statusCardClassLookup = {0: "secondary", 1: "danger", 2: "success"}

// Load page script
const pageScript = document.createElement('script')
pageScript.async = true
let scriptName = "events"
if((match = /^\/(\w*)/.exec(window.location.pathname)) !== null) {
	if(["events", "matches", "subscriptions"].includes(match[1])) scriptName = match[1]
}
pageScript.src = "/scripts/page-" + scriptName + ".js"
document.head.appendChild(pageScript)


// Methods
function sortBySubscription(containerSelector, childSelector, func) {
	subscriptionUpdateUIWait(() => {
		$(containerSelector).each(function() {
			if(!$(".notification-unsubscribe", this).is(':visible')) return true // continue
			
			const childs = $(this).children(childSelector).sort((a, b) => {
				const aIsSubbed = $(".notification-unsubscribe", a).is(':visible')
				const bIsSubbed = $(".notification-unsubscribe", b).is(':visible')
				
				if(aIsSubbed != bIsSubbed) {
					return aIsSubbed ? -1 : 1
				} else {
					return 0 // dont move, as sorting was done beforehand
				}
			})
			$(this).append(childs)
		})
		
		subscriptionUpdateUI()
		
		if(typeof func == 'function') func()
	})
}

// Collapsible for mobile
function limitExpandItems(containerSelector, childSelector, expandBreakpoint) {
	$(containerSelector).each(function() {
		const eventItem = $(this)
		
		let i = 0
		const childs = $(childSelector, eventItem)
		if(childs.length <= expandBreakpoint) return false
		
		childs.each(function() {
			i++
			
			if(i == expandBreakpoint) {
				eventItem.append(`<div class="col-12 d-block d-sm-none expand-items" data-breakpoint="`+expandBreakpoint+`">
					<div class="d-grid gap-2">
						<button class="btn btn-lg btn-primary" type="button">See more</button>
					</div>
				</div>`)
			} else if(i > expandBreakpoint) {
				$(this).addClass("d-none d-sm-block")
			}
		})
	})
}
$("body").on("click", ".expand-items", function(evt) {
	const container = $(this).closest(".expand-container")
	const expandBreakpoint = parseInt($(this).attr("data-breakpoint"))
	const childs = container.find("> .d-none:not(.expand-items)")
	const hasMore = childs.length > expandBreakpoint
	
	$(childs.slice(0, expandBreakpoint)).each(function() {
		$(this).removeClass("d-none d-sm-block")
	})
	
	if(!hasMore) $(this).remove()
})

function getMatchItem(matchData) {
	const thisMatchItem = $("#template-elements > .match-item").clone()
	
	//$(".card", thisMatchItem).addClass("bg-"+statusCardClassLookup[matchData.status])
	thisMatchItem.addClass("match-status-" + matchData.status)
		.attr("data-subscription-type", "matches").attr("data-subscription-label", matchData.id)
	
	const date = matchData.date.toDate()
	$(".card-header .left-info .stage-name", thisMatchItem).text(matchData.stage)
	$(".card-header .left-info .event-date", thisMatchItem).text(dateFormat(date))
	$(".card-header .right-info .status-label", thisMatchItem).text(statusLookup[matchData.status].toUpperCase())
	
	let timeDiff = get_time_diff_label(matchData.status, date)
	$(".card-header .right-info .event-date-diff", thisMatchItem).html(timeDiff).attr("data-timestamp", date.getTime()).attr("data-status", matchData.status)
	
	$('.team-side[data-team=0] .team-name', thisMatchItem).text(matchData.team1)
	let score1 = "map1" in matchData ? matchData.map1 : "-"
	if("round1" in matchData) score1 += " (" + matchData.round1 + ")"
	$('.team-side[data-team=0] .team-score', thisMatchItem).text(score1)
	
	$('.team-side[data-team=1] .team-name', thisMatchItem).text(matchData.team2)
	let score2 = "map2" in matchData ? matchData.map2 : "-"
	if("round2" in matchData) score2 += " (" + matchData.round2 + ")"
	$('.team-side[data-team=1] .team-score', thisMatchItem).text(score2)
	
	return thisMatchItem
}
// Update relative time every second
setInterval(function() {
	let tmpDate, tmpStatus
	$(".card-header .right-info .event-date-diff").not("[data-status=1]").each(function() {
		tmpStatus = parseInt($(this).attr("data-status"))
		tmpDate = new Date(parseInt($(this).attr("data-timestamp")))
		
		let timeDiff = get_time_diff_label(tmpStatus, tmpDate)
		$(this).html(timeDiff)
	})
}, 1000)

function dateFormat(dateObj) {
	return dateObj.toLocaleString(navigator.language || navigator.userLanguage, {
		timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
	})
}

// https://stackoverflow.com/a/5767357/1424378
function removeItemOnce(arr, value) {
  var index = arr.indexOf(value);
  if (index > -1) {
    arr.splice(index, 1);
  }
  return arr;
}

function get_time_diff_label(matchStatus, dateTime) {
	let timeDiff = get_time_diff(dateTime)
	
	if(matchStatus == 1) {
		return '<i class="fa-solid fa-circle"></i>'
	} else if(matchStatus == 2) {
		return timeDiff + " AGO"
	} else {
		let now = new Date()
		return now < dateTime ? "IN " + timeDiff : "Starting..."
	}
}

// https://stackoverflow.com/a/18103175/1424378
function get_time_diff( datetime )
{
    var datetime = new Date( datetime ).getTime();
    var now = new Date().getTime();

    if( isNaN(datetime) ) return "";

    if (datetime < now) {
        var milisec_diff = now - datetime;
    }else{
        var milisec_diff = datetime - now;
    }

    var days = Math.floor(milisec_diff / 1000 / 60 / (60 * 24));
    var date_diff = new Date(milisec_diff);

	let finalStr = ""
	if(days > 0) return days + " DAYS"
	if(date_diff.getHours() > 0) finalStr += date_diff.getHours() + "H "
	if(date_diff.getMinutes() > 0) finalStr += date_diff.getMinutes() + "M "
	if(date_diff.getHours() == 0 && date_diff.getSeconds() > 0) finalStr += date_diff.getSeconds() + "S "
    return finalStr
}