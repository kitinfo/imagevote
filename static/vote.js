/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var vote = {
    url: "http://vote.nsa-cloud.org/server/api.php",
    //url:"server/api.php",
    init: function() {
	vote.getRandomImage();
	vote.getAnswers();


	document.addEventListener("keyup", function(event) {
	    console.log(event);
	    
	    switch (event.keyCode) {
		case 39:
		    vote.vote(0);
		    break;
		case 37:
		    vote.vote(1);
		    break;
		case 32:
		    vote.getRandomImage();
		    break;
	    }
	}, false);
    },
    getRandomImage: function() {
	ajax.asyncGet(vote.url + "?random", function(xhr) {
	    var parsed = JSON.parse(xhr.response);

	    if (parsed.get) {
		var img = document.createElement('img');
		img.setAttribute('src', parsed.get[0].url);
		img.setAttribute('alt', "picture");

		var picture = document.getElementById("picture");

		picture.innerHTML = "";
		picture.setAttribute("data-id", parsed.get[0].id);
		picture.appendChild(img);

	    }
	});
    },
    fail: function() {
	document.getElementById("status").textContent = "failed";
    },
    getAnswers: function() {
	ajax.asyncGet(vote.url + "?answers", function(xhr) {
	    var parsed = JSON.parse(xhr.response);
	    var elem = document.getElementById("answers");

	    elem.innerHTML = "";
	    parsed.answer.forEach(function(val) {
		var span = document.createElement('span');
		span.setAttribute('class', 'button');
		span.setAttribute('onclick', "vote.vote(" + val.id + ");");
		span.textContent = val.name;

		elem.appendChild(span);
	    });
	});
    },
    vote: function(id) {

	var obj = {
	    image: document.getElementById("picture").dataset.id,
	    reply: id
	};

	ajax.asyncPost(vote.url + "?vote", JSON.stringify(obj), function(xhr) {
	    vote.setStatus(JSON.parse(xhr.response).status.replies[2]);
	    vote.getRandomImage();
	});
    },
    setStatus: function(string) {
	document.getElementById("status").textContent = string;
    },
    columns: {
	id: function(val) {
	    var id = document.createElement('td');
	    id.setAttribute('id', 'row' + val.id);
	    id.textContent = val.id;
	    return id;
	},
	img: function(val) {
	    var picture = document.createElement('img');
	    picture.setAttribute('height', "50px");
	    picture.setAttribute('src', val.url);
	    picture.setAttribute('alt', val.url);

	    var ptd = document.createElement('td');
	    ptd.setAttribute('class', 'colPtd');
	    ptd.setAttribute('id', 'ptd' + val.id);
	    ptd.appendChild(picture);
	    return ptd;
	},
	up: function(val) {
	    var td = document.createElement('td');
	    td.setAttribute("id", "trElem" + val.id + "/" + 1);
	    td.setAttribute("class", "trCol" + 1);
	    return td;
	},
	down: function(val) {
	    var td = document.createElement('td');
	    td.setAttribute("id", "trElem" + val.id + "/" + 2);
	    td.setAttribute("class", "trCol" + 2);
	    return td;
	},
	av: function(val) {
	    var av = document.createElement('td');
	    av.setAttribute('id', "av" + val.id);
	    return av;
	}
    },
    stats: function() {
	ajax.asyncGet(vote.url + "?sum_votes", function(xhr) {
	    document.getElementById("sumVotes").textContent = "Votes: " + JSON.parse(xhr.response).sum[0].votes;
	});
	ajax.asyncGet(vote.url + "?stats", function(xhr) {

	    var stats = JSON.parse(xhr.response).stats;

	    stats.forEach(function(val) {

		if (document.getElementById("row" + val.id)) {
		    vote.updateStats(val);
		} else {

		    var tr = document.createElement('tr');
		    tr.setAttribute("id", "tr" + val.id);
		    
		    tr.appendChild(vote.columns.id(val));
		    tr.appendChild(vote.columns.img(val));
		    var up = vote.columns.up(val);
		    tr.appendChild(up);
		    var down = vote.columns.down(val);
		    tr.appendChild(down);
		    var av = vote.columns.av(val);
		    tr.appendChild(av);

		    document.getElementById('tableBody').appendChild(tr);
		    
		    vote.updateStats(val);

		}
	    });
	    var topV = document.getElementById('tr' + vote.topVoted.id).cloneNode(true);
	    var topH = document.getElementById('tr' + vote.topHated.id).cloneNode(true);
		    document.getElementById("top").innerHTML = "";
		    document.getElementById("top").
			    appendChild(topV);
		    document.getElementById("top").
			    appendChild(topH);

	});
    },
    updateStats: function(val) {
	var up = document.getElementById('trElem' + val.id + "/" + 1);

	var down = document.getElementById('trElem' + val.id + "/" + 2);
	
	var av = document.getElementById('av' + val.id);
	var avValue = 0; 

	val.stats.forEach(function(a) {

	    if (a.reply == 1) {
		up.textContent = a.votes;
		avValue += parseInt(a.votes);
	    }
	    if (a.reply == 2) {
		down.textContent = "-" + a.votes;
		avValue -= parseInt(a.votes);
	    }

	    
	});
	    av.textContent = avValue;
	    vote.checkTopVoted(val);
    },
    checkTopVoted: function(val) {
	var current = parseInt(document.getElementById('av' + val.id).textContent);
	if (!vote.topVoted) {
	    vote.topVoted = val;
	    vote.topVoted.av = current;
	} else {
	    if (vote.topVoted.av < current) {
		vote.topVoted = val;
		vote.topVoted.av = current;
	    }
	}
	if (!vote.topHated) {
	    vote.topHated = val;
	    vote.topHated.av = current;
	} else {
	    if (vote.topHated.av > current) {
		vote.topHated = val;
		vote.topHated.av = current;
	    }
	}
    }
};


