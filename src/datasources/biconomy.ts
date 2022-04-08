import axios from "axios";
import creaton_contracts from "../contracts";

export async function addGasless(contractName: string, contractAddress: string, method: string) {
    // Add the Contract
    const addContractData = new URLSearchParams({
      contractName: contractName + contractAddress.slice(2, 10),
      contractAddress: contractAddress,
      abi: JSON.stringify(creaton_contracts[contractName].abi(contractName)),
      contractType: 'SC',
      metaTransactionType: 'TRUSTED_FORWARDER',
    });
  
    let response = await axios.post('https://api.biconomy.io/api/v1/meta-api/public-api/addContract', 
      new URLSearchParams(addContractData),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          authToken: process.env.BICONOMY_AUTH,
          apiKey: process.env.BICONOMY_API,
        },
      }
    );
  
    if(response.status != 200){
      return {error: `An error has occured adding the Contract: ${response.statusText}`};
    }
  
    // Add the Method
    const addMethodData = {
      apiType: 'native',
      methodType: 'write',
      name: method + contractAddress.slice(2, 6),
      contractAddress: contractAddress,
      method,
    };
  
    response = await axios.post('https://api.biconomy.io/api/v1/meta-api/public-api/addMethod', 
      new URLSearchParams(addMethodData),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          authToken: process.env.BICONOMY_AUTH,
          apiKey: process.env.BICONOMY_API,
        },
      }
    );
  
    if(response.status != 200){
      return {error: `An error has occured adding the Method: ${response.statusText}`};
    }
  
    return response.data;
  }
  
  export async function removeGasless(contractAddress: string, method: string) {
    const response = await axios.delete('https://api.biconomy.io/api/v1/meta-api/public-api/deleteMethod', 
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          authToken: process.env.BICONOMY_AUTH,
          apiKey: process.env.BICONOMY_API,
        },
        data: new URLSearchParams({ contractAddress, method }),
      }
    );
  
    if(response.status != 200){
      return {error: `An error has occured: ${response.statusText}`};
    }
  
    return response.data;
  }