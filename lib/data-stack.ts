import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as dynamo from 'aws-cdk-lib/aws-dynamodb';

export class DataStack extends cdk.Stack {
  public readonly userTable: dynamo.ITable;
  public readonly productsTable: dynamo.ITable;
  public readonly cartTable: dynamo.ITable;
  public readonly ordersTable: dynamo.ITable;
  public readonly analyticsTable: dynamo.ITable;
  public readonly inventoryTable: dynamo.ITable;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.userTable = dynamo.Table.fromTableName(this, 'RicemillUserTable', 'Ricemill_user_cdk');
    this.productsTable = dynamo.Table.fromTableName(this, 'RicemilproductsTable', 'Ricemill_products_cdk');
    this.cartTable = dynamo.Table.fromTableName(this, 'RicemillcartcountTable', 'Ricemill_carts_cdk');
    this.ordersTable = dynamo.Table.fromTableName(this, 'RicemillputordersTable', 'Ricemill_orders_cdk');
    this.analyticsTable = dynamo.Table.fromTableName(this, 'RicemillanalyticsTable', 'Ricemill_analytics_v3_cdk');
    this.inventoryTable = dynamo.Table.fromTableName(this, 'RicemillproductinventoryTable', 'Ricemill_product_inventory_cdk');
  }
}