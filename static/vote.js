/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var vote = {
    url: "http://31.172.102.146/server/api.php",
    init: function() {
	vote.getRandomImage();
	vote.getAnswers();
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
    stats: function() {
	ajax.asyncGet(vote.url + "?sum_votes", function(xhr) {
	   document.getElementById("sumVotes").textContent = "Votes: " + JSON.parse(xhr.response).sum[0].votes;
	});
	ajax.asyncGet(vote.url + "?stats", function(xhr) {
	    
	    var stats = JSON.parse(xhr.response).stats;
	    
	    var answers = JSON.parse(xhr.response).answer;
	    
	    var elem = document.getElementById("headLine");
	    var elem2 = document.getElementById("tHead");
	    
	    answers.forEach(function(val) {
		var th = document.createElement('th');
		th.textContent = val.name;
		elem.appendChild(th);
		elem2.appendChild(th);
	    });
	    
	    /**
	     * only for this
	     */
	    var av = document.createElement('th');
	    av.textContent = "Durschnitt";
	    elem.appendChild(av);
	    elem2.appendChild(av);
	    
	    
	    var topVoted = null;
	    var topHated = null;
	    
	    stats.forEach(function(val) {
		
		var tr = document.createElement('tr');
		tr.setAttribute("id", "tr" + val.id);
		
		var id = document.createElement('td');
		id.textContent = val.id;
		tr.appendChild(id);
		
		var picture = document.createElement('img');
		picture.setAttribute('height', "50px");
		picture.setAttribute('src', val.url);
		picture.setAttribute('alt', val.url);
		
		var ptd = document.createElement('td');
		ptd.appendChild(picture);
		tr.appendChild(ptd);
		
		answers.forEach(function(a) {
		    var td = document.createElement('td');
		    td.setAttribute("id", "trElem" +  val.id + "/" + a.id);
		    td.setAttribute("class", "trCol" + a.id);
		    tr.appendChild(td);
		});
		document.getElementById('tableBody').appendChild(tr);
		
		
		var avValue = 0;
		
		val.stats.forEach(function(a) {
		    var e = document.getElementById('trElem' + a.image + "/" + a.reply);
		    e.textContent = a.votes;
		    if (a.reply == 2) {
			avValue -= parseInt(a.votes);
		    } else {
			avValue += parseInt(a.votes);
		    }
		
		});
		
		/**
		 * only for this app
		 */
		var av = document.createElement("td");
		av.textContent = avValue;
		tr.appendChild(av);
		
		if (!topVoted) {
		    topVoted = val;
		    topVoted.av = avValue;
		} else {
		    if (topVoted.av < avValue) {
			topVoted = val;
			topVoted.av = avValue;
		    }
		}
		if (!topHated) {
		    topHated = val;
		    topVoted.av = avValue;
		} else {
		    if (topHated.av > avValue) {
			topHated = val;
			topHated.av = avValue;
		    }
		}
	    });
	    document.getElementById("top").innerHTML = "";
	    
	    document.getElementById("top").
		    appendChild(document.getElementById('tr' + topVoted.id));
	    document.getElementById("top").
		    appendChild(document.getElementById('tr' + topHated.id));
	});
    }
};


