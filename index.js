import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { ddbClient } from "./ddbClient.js";
import { DeleteItemCommand, GetItemCommand, PutItemCommand, ScanCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";

export const handler = async (event) => {
    console.log("request:",JSON.stringify(event, undefined,2));
    let body;

    try{
        switch(event.httpMethod){
            case "GET":
                if(event.pathParameters != null){
                    body = await getProduct(event.pathParameters.id);
                }else{
                    body = await getAllProducts();
                }
                break;
            case "POST":
                body = await createProduct(event);
                break;
            case "DELETE":
                body = await deleteProduct(event.pathParameters.id);
                break;
            case "PUT":
                body = await updateProduct(event);
                break;
            default:
                throw new Error(`Unsupported route: "${event.httpMethod}"`);
        }
        console.log(body);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Successfully finished operation: "${event.httpMethod}"`,
                body: body
              })
        };
    }catch(e){
        console.error(e);
        return {
          statusCode: 500,
          body: JSON.stringify({
            message: "Failed to perform operation.",
            errorMsg: e.message,
            errorStack: e.stack,
          })
        };
    }  
};

const getProduct = async(productId) =>{
    console.log("getProduct");
    try{
        const params = {
            TableName : process.env.DYNAMODB_TABLE_NAME,
            Key: marshall({id: productId})
        };

        const { Item } = await ddbClient.send(new GetItemCommand(params));
        console.log(Item);
        return (Item) ? unmarshall(Item) : {};

    }catch(e){
        console.error(e);
        throw e;
    }
}

const getAllProducts = async() => {
    console.log("getAllProducts");
    try{
        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME
        };
        const { Items } = await ddbClient.send(new ScanCommand(params));
        
        console.log(Items);
        return (Items) ? Items.map((item)=>unmarshall(item)) : {};
    }catch(e){
        console.error(e);
        throw e;
    }
}

const createProduct = async(event) => {
    try{
        console.log(`createProduct function. event: "${event}"`);

        // const requestBody = JSON.parse(event.body);
        const productRequest = JSON.parse(event.body);
        const productId = uuidv4();
        productRequest.id = productId;
        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Item: marshall(productRequest || {})
        };
        const createResult = await ddbClient.send(new PutItemCommand(params));
        console.log(createResult);
        return createResult;
    }catch(e){
        console.error(e);
        throw e;
    }
}

const deleteProduct = async (productId) => {
    try {
      console.log(`deleteProduct function. productId : "${productId}"`);
  
      const params = {
        TableName: process.env.DYNAMODB_TABLE_NAME,
        Key: marshall({ id: productId })
      };  
  
      const deleteResult = await ddbClient.send(new DeleteItemCommand(params));
      console.log(deleteResult);
      return deleteResult;
  
    } catch(e) {
      console.error(e);
      throw e;
    }
  }



  const updateProduct = async (event) => {
    try {
      const requestBody = JSON.parse(event.body);
      const objKeys = Object.keys(requestBody);
      console.log(`updateProduct function. requestBody : "${requestBody}", objKeys: "${objKeys}"`);
  
      const params = {
        TableName: process.env.DYNAMODB_TABLE_NAME,
        Key: marshall({ id: event.pathParameters.id }),
        UpdateExpression: `SET ${objKeys.map((_, index) => `#key${index} = :value${index}`).join(", ")}`,
        ExpressionAttributeNames: objKeys.reduce((acc, key, index) => ({
            ...acc,
            [`#key${index}`]: key,
        }), {}),
        ExpressionAttributeValues: marshall(objKeys.reduce((acc, key, index) => ({
            ...acc,
            [`:value${index}`]: requestBody[key],
        }), {})),
      };
  
      const updateResult = await ddbClient.send(new UpdateItemCommand(params));
      console.log(updateResult);
      return updateResult;
  
    } catch(e) {
      console.error(e);
      throw e;
    }
  }