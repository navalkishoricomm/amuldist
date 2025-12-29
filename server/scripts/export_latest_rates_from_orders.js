print('retailer_name,retailer_id,product_name,product_id,price,last_order_date');
db = db.getSiblingDB('amul_dist_app');
db.orders.aggregate([
  { $unwind: '$items' },
  { $project: { retailerId: 1, distributorId: 1, productId: '$items.productId', price: '$items.price', createdAt: 1 } },
  { $sort: { retailerId: 1, productId: 1, createdAt: -1 } },
  { $group: { 
      _id: { retailerId: '$retailerId', productId: '$productId' },
      price: { $first: '$price' },
      last_order_date: { $first: '$createdAt' },
      retailerId: { $first: '$retailerId' },
      productId: { $first: '$productId' }
    }
  },
  { $lookup: { from: 'users', localField: 'retailerId', foreignField: '_id', as: 'ret' } },
  { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'prod' } },
  { $project: {
      retailer_name: { $ifNull: [ { $arrayElemAt: ['$ret.name', 0] }, '' ] },
      retailer_id: { $toString: '$retailerId' },
      product_name: { $ifNull: [ { $arrayElemAt: ['$prod.nameEnglish', 0] }, '' ] },
      product_id: { $toString: '$productId' },
      price: '$price',
      last_order_date: { $dateToString: { date: '$last_order_date', format: '%Y-%m-%dT%H:%M:%S.%LZ' } }
    }
  }
]).forEach(function (doc) {
  function esc(s) { return '"' + String(s).replace(/"/g,'""') + '"'; }
  var row = [
    esc(doc.retailer_name),
    esc(doc.retailer_id),
    esc(doc.product_name),
    esc(doc.product_id),
    doc.price,
    esc(doc.last_order_date)
  ].join(',');
  print(row);
});
