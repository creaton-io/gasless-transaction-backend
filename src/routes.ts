import 'dotenv/config';
import { Router } from 'express';
import { ethers, Contract } from "ethers";
import { BaseProvider } from '@ethersproject/providers';
import axios from 'axios';
import creaton_contracts from './contracts';

const routes = Router();

routes.get('/', async (req, res) => {
  return res.json({hola: "foo"});
});

routes.get('/gaslessCheck', async (req, res) => {
  const query = `{
    creators {
      id
      user
      creatorContract
    }
  }`;
  const response = await axios.post(
    process.env.GRAPH_URI, 
    { query },
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }}
  );

  const added = [];
  const removed = [];
  const users: any = response.data.data.creators;
  let a: any = '';
  const method = 'upload';
  for(a of users){
    if(await shouldAddGasless(a["user"])){
      added.push(a["user"]);
      addGasless('Creator', a['creatorContract'], method);
    }else{
      removed.push(a["user"]);
      removeGasless(a['creatorContract'], method);
    }
  }

  return res.json({added, removed});
});

routes.post('/gasless', async (req, res) => { 
  const walletAddress: string = req.body.walletAddress;
  const creatorContractAddress: string = req.body.creatorContractAddress;
  const signedMessage: string = req.body.signedMessage;

  const recoveredSigner = ethers.utils.verifyMessage(`Creaton: Enabling gasless transactions for ${walletAddress}`, signedMessage);
  if(recoveredSigner != walletAddress){
    return res.json({error: "Signature doesn't match the sender"});
  }

  try {
    ethers.utils.getAddress(walletAddress);
    ethers.utils.getAddress(creatorContractAddress);
  } catch (e) {
    return res.json({error: e});
  }

  const method = 'upload';
  if(await shouldAddGasless(walletAddress)){
    return res.json(addGasless('Creator', creatorContractAddress, method));
  }else{
    return res.json(removeGasless(creatorContractAddress, method));
  }
});

async function shouldAddGasless(walletAddress: string){
  const tokenAddress: string = process.env.TOKEN_ADDRESS || '';
  const threshold: string = process.env.TOKEN_AMOUNT_THRESHOLD || '0';

  const provider: BaseProvider = ethers.getDefaultProvider();
  const contract: Contract = new ethers.Contract(tokenAddress, creaton_contracts.erc20.abi, provider);
  const balance: string = (await contract.balanceOf(walletAddress)).toString();

  return (balance >= threshold);
}

async function addGasless(contractName: string, contractAddress: string, method: string) {
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

async function removeGasless(contractAddress: string, method: string) {
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

routes.post('/gaslessContractAndMethod', async (req, res) => { 
  const contractName: string = req.body.contractName;
  const contractAddress: string = req.body.contractAddress;
  const method: string = req.body.method;

  return res.json(addGasless(contractName, contractAddress, method));
});

export default routes;