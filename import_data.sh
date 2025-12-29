#!/bin/bash
# Import data from JSON files in /root/data_dump

DB_NAME="amul_dist_app"
DATA_DIR="/root/data_dump"

echo "Importing users..."
mongoimport --db $DB_NAME --collection users --file "$DATA_DIR/users.json" --jsonArray

echo "Importing products..."
mongoimport --db $DB_NAME --collection products --file "$DATA_DIR/products.json" --jsonArray

echo "Importing units..."
mongoimport --db $DB_NAME --collection units --file "$DATA_DIR/units.json" --jsonArray

echo "Importing orders..."
mongoimport --db $DB_NAME --collection orders --file "$DATA_DIR/orders.json" --jsonArray

echo "Importing transactions..."
mongoimport --db $DB_NAME --collection transactions --file "$DATA_DIR/transactions.json" --jsonArray

echo "Importing stockmoves..."
mongoimport --db $DB_NAME --collection stockmoves --file "$DATA_DIR/stockmoves.json" --jsonArray

echo "Importing suppliers..."
mongoimport --db $DB_NAME --collection suppliers --file "$DATA_DIR/suppliers.json" --jsonArray

echo "Importing suppliertransactions..."
mongoimport --db $DB_NAME --collection suppliertransactions --file "$DATA_DIR/suppliertransactions.json" --jsonArray

echo "Importing distproducts..."
mongoimport --db $DB_NAME --collection distproducts --file "$DATA_DIR/distproducts.json" --jsonArray

echo "Importing retailer rates..."
mongoimport --db $DB_NAME --collection "retailer rates" --file "$DATA_DIR/retailer rates.json" --jsonArray

echo "Import complete."
