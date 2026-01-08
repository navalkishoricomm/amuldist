const header = ['distributor_name','distributor_id','retailer_name','retailer_id','product_name','product_id','price','updated_at'];
print(header.join(','));
db = db.getSiblingDB('amul_dist_app');
db.retailerrates.aggregate([
  { $lookup: { from: 'users', localField: 'distributorId', foreignField: '_id', as: 'dist' } },
  { $lookup: { from: 'users', localField: 'retailerId', foreignField: '_id', as: 'ret' } },
  { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'prod' } },
  { $project: {
      distributor_name: { $ifNull: [ { $arrayElemAt: ['$dist.name', 0] }, '' ] },
      distributor_id: { $toString: '$distributorId' },
      retailer_name: { $ifNull: [ { $arrayElemAt: ['$ret.name', 0] }, '' ] },
      retailer_id: { $toString: '$retailerId' },
      product_name: { $ifNull: [ { $arrayElemAt: ['$prod.nameEnglish', 0] }, '' ] },
      product_id: { $toString: '$productId' },
      price: '$price',
      updated_at: { $dateToString: { date: '$updatedAt', format: '%Y-%m-%dT%H:%M:%S.%LZ' } }
    }
  }
]).forEach(function (doc) {
  function esc(s) { return '"' + String(s).replace(/"/g,'""') + '"'; }
  var row = [
    esc(doc.distributor_name),
    esc(doc.distributor_id),
    esc(doc.retailer_name),
    esc(doc.retailer_id),
    esc(doc.product_name),
    esc(doc.product_id),
    doc.price,
    esc(doc.updated_at)
  ].join(',');
  print(row);
});
