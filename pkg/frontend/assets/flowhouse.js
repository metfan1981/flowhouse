var filtersCount = 0;

$(document).ready(function() {
  var start = formatTimestamp(new Date(((new Date() / 1000) - 900 - new Date().getTimezoneOffset() * 60)* 1000));
  if ($("#time_start").val() == "") {
    $("#time_start").val(start);
  }

  var end = formatTimestamp(new Date(((new Date() / 1000) - new Date().getTimezoneOffset() * 60)* 1000));
  if ($("#time_end").val() == "") {
    $("#time_end").val(end);
  }

  $("#filterPlus").click(addFilter);
  $("form").on('submit', submitQuery);

  google.charts.load('current', {
   'packages': ['corechart']
  });
   
  window.onhashchange = function () {
    google.charts.setOnLoadCallback(drawChart);
  }

  google.charts.setOnLoadCallback(drawChart);

  populateFields();
});

function addFilter() {
  const filterTemplate = $("#filterTemplate").html().replace(/__NUM__/g, filtersCount);
  $("#filters").append(filterTemplate);

  const $filterField = $(`#filter_field\\[${filtersCount}\\]`);
  const $filterValue = $(`#filter_value\\[${filtersCount}\\]`);
  const $filterRemove = $(`#filter_remove\\[${filtersCount}\\]`);

  $filterField.change(function() {
    const fieldName = $(this).val();
    const filterNum = $(this).attr("id").match(/\d+/)[0];
    $filterValue.attr("name", fieldName);
    loadValues(filterNum, fieldName);
  });

  $filterRemove.click(function() {
    $(this).closest('.row').remove();
  });

  filtersCount++;
}


function parseParams(str) {
  return str.split('&').reduce(function(params, param) {
    const [key, value] = param.split('=').map(decodeURIComponent);
    params[key] = value.replace(/\+/g, ' ');
    return params;
  }, {});
}

function populateFields() {
  var query = location.href.split("#")[1];
  if (!query) {
    return;
  }

  var queryEquations = query.split('&');
  for (var i = 0; i < queryEquations.length; i++) {
    var e = queryEquations[i].split('=');
    var k = e[0];
    var v = decodeURIComponent(e[1]);

    if (k == "breakdown") {
      $("#breakdown option[value=" + v + "]").attr('selected', 'selected');
      continue;
    }
    
    if (k == "time_start") {
      $("#time_start").val(v);
      continue;
    }
    
    if (k == "time_end") {
      $("#time_end").val(v);
      continue;
    }

    if (k.match(/^filter_field/)) {
      continue;
    }

    var fieldIndex = addFilter();
    $("#filter_field\\[" + fieldIndex + "\\]").val(k);
    $("#filter_field\\[" + fieldIndex + "\\]").trigger("change");
    $("#filter_value\\[" + fieldIndex + "\\]").val(v);
  }
}

function submitQuery() {
  params = $('form').serialize();
  location.href = "#" + params
  return false
}

function drawChart() {
  var query = location.href.split("#")[1]
  if (!query) {
    return;
  }

  $.ajax({
    type: "GET",
    url: "/query?" + query,
    dataType: "text",
    success: function(rdata, status, xhr) {
      if (rdata == undefined) {
        $("#chart_div").text("No data found")
          return
        }
      renderChart(rdata)
    },
    error: function(xhr) {
      $("#chart_div").text(xhr.responseText)
    }
  })
}

function renderChart(rdata) {
  pres = Papa.parse(rdata.trim())

  var data = [];
  for (var i = 0; i < pres.data.length; i++) {
    for (var j = 0; j < pres.data[i].length; j++) {
      if (j == 0) {
        data[i] = [];
      }
      x = pres.data[i][j];
      if (i != 0) {
        if (j != 0) {
          x = parseInt(x)
        }
      }
      data[i][j] = x;
    }
  }

  data = google.visualization.arrayToDataTable(data);
  var options = {
    isStacked: true,
    title: 'Flow Mbps',
    titleTextStyle: {
      fontSize: 24,
      bold: true,
      color: '#333'
    },
    hAxis: {
      title: 'Time',
      titleTextStyle: {
        color: '#333',
        italic: false,
        bold: true,
        fontSize: 14
      },
      gridlines: {
        color: '#f3f3f3',
        count: 10
      },
      minorGridlines: {
        color: '#e9e9e9'
      },
      format: 'HH:mm:ss',
      textStyle: {
        color: '#333',
        fontSize: 12
      }
    },
    vAxis: {
      minValue: 0,
      title: 'Megabits per second',
      titleTextStyle: {
        color: '#333',
        italic: false,
        bold: true,
        fontSize: 14
      },
      gridlines: {
        color: '#f3f3f3',
        count: 10
      },
      minorGridlines: {
        color: '#e9e9e9'
      },
      textStyle: {
        color: '#333',
        fontSize: 12
      }
    },
    height: screen.height * 0.7,
    chartArea: {
      width: '90%', 
      height: '70%',
      top: '5%',
      backgroundColor: {
        stroke: '#ccc',
        strokeWidth: 1
      }
    },
    backgroundColor: '#ffffff',
    colors: ['#2196F3', '#4CAF50', '#FFC107', '#FF5722', '#9C27B0'],
    animation: {
      startup: true,
      duration: 1000,
      easing: 'out'
    },
    legend: {
      position: 'none'
    },
    tooltip: {
      textStyle: {
        color: '#333',
        fontSize: 12
      },
      showColorCode: true
    },
    lineWidth: 2,
    pointSize: 2,
    series: {
      0: { lineDashStyle: [4, 4] },
      1: { lineDashStyle: [2, 2] },
      2: { lineDashStyle: [4, 2] },
      3: { lineDashStyle: [2, 4] },
      4: { lineDashStyle: [1, 1] }
    }
  };

  var chart = new google.visualization.AreaChart(document.getElementById('chart_div'));
  chart.draw(data, options);

  const customLegendDiv = document.getElementById('custom_legend');
  customLegendDiv.innerHTML = ''; // Clear any existing legend
  const colors = options.colors;
  const columns = data.getNumberOfColumns();

  const table = document.createElement('table');
  table.classList.add('table', 'table-sm', 'table-bordered');
  const tbody = document.createElement('tbody');

  for (let i = 1; i < columns; i++) {
    const row = document.createElement('tr');
    const colorCell = document.createElement('td');
    colorCell.style.backgroundColor = colors[(i - 1) % colors.length];
    colorCell.style.width = '20px';
    const labelCell = document.createElement('td');
    labelCell.textContent = data.getColumnLabel(i);
    row.appendChild(colorCell);
    row.appendChild(labelCell);
    tbody.appendChild(row);

    (function(seriesIndex) {
      row.addEventListener('mouseover', function() {
        highlightSeries(chart, data, options, seriesIndex);
      });
      row.addEventListener('mouseout', function() {
        resetHighlight(chart, data, options);
      });
    })(i - 1);
  }

  table.appendChild(tbody);
  customLegendDiv.appendChild(table);
}

function formatTimestamp(date) {
  return date.toISOString().substr(0, 16)
}

function loadValues(filterNum, field) {
    return $.getJSON("/dict_values/"+field, function(data) {
        $("#filter_value\\[" + filterNum + "\\]").autocomplete({
            source: data,
        });
    });
}