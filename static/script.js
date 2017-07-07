function poll(){

  $.get('/store', function(data){
    $('.item').remove()
    _(data)
      .sortBy(function(item){ return parseInt(item.qty) })
      .map(function(item){
        return $('<tr >', {id: item.code, class: 'item', style: 'height: 60px'}).append([
          $('<td>', {text: item.qty}),
          $('<td>', {text: item.code}),
          $('<td>', {text: item.name}),
          item.qty == 0 ? $('<td><a class="btn btn-primary">Order!<a></td>') : $('<td>')
        ])
      })
      .reduce(function($acc, $row){
        return $acc.append($row)
      }, $('.table'))
  })
}

jQuery(function($){
  setInterval(poll, 1000)
  poll()
})
