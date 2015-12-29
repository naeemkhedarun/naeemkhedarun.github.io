function getArrayFromTable(element){
	var array = [[]];
  
  $(element).find("th").each(function(index, item) {
    array[0].push($(item).html());
  });

  $(element).find("tr").has('td').each(function() {
    array.push([]);
    var index = array.length-1;
    $('td', $(this)).each(function(i, item) {
      var value = $(item).html()
      array[index].push(parseFloat(value) || value);
    });
  });
  
  return array;
}

function drawCharts() {

	$('chart').each(function(index, element){
    var table = element.nextElementSibling; 
    
    var tableTable = getArrayFromTable(table);
    var data = google.visualization.arrayToDataTable(tableTable);
    
    var jsonOptions = element.getAttribute('options').replace(/'/g, '"')
    
    var options = JSON.parse(jsonOptions);
    var type = stringToFunction('google.visualization.' + element.getAttribute('type'));
    var chart = new type($(element).find("div")[0]);
    chart.draw(data, options);
    
    $(table).hide()
  });
  
}

var stringToFunction = function(str) {
  var arr = str.split(".");

  var fn = (window || this);
  for (var i = 0, len = arr.length; i < len; i++) {
    fn = fn[arr[i]];
  }

  if (typeof fn !== "function") {
    throw new Error("function not found");
  }

  return fn;
};

google.setOnLoadCallback(drawCharts);