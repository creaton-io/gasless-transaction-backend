import 'dotenv/config';
import { Router } from 'express';
import { ethers, Contract } from "ethers";
import erc20 from './abi/erc20.json';
import { BaseProvider } from '@ethersproject/providers';
import axios from 'axios';

const routes = Router();

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
  for(a of users){
    if(await shouldAddGasless(a["user"])){
      added.push(a["user"]);
      addGasless(a['creatorContract']);
    }else{
      removed.push(a["user"]);
      removeGasless(a['creatorContract']);
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

  if(await shouldAddGasless(walletAddress)){
    return res.json(addGasless(creatorContractAddress));
  }else{
    return res.json(removeGasless(creatorContractAddress));
  }
});

async function shouldAddGasless(walletAddress: string){
  const tokenAddress: string = process.env.TOKEN_ADDRESS || '';
  const threshold: string = process.env.TOKEN_AMOUNT_THRESHOLD || '0';

  const provider: BaseProvider = ethers.getDefaultProvider();
  const contract: Contract = new ethers.Contract(tokenAddress, erc20.abi, provider);
  const balance: string = (await contract.balanceOf(walletAddress)).toString();

  return (balance >= threshold);
}

async function addGasless(creatorContractAddress: string) {
  const addMethodData = {
    apiType: 'native',
    methodType: 'write',
    name: 'upload' + creatorContractAddress.slice(2, 6),
    contractAddress: creatorContractAddress,
    method: 'upload',
  };

  const response = await axios.post('https://api.biconomy.io/api/v1/meta-api/public-api/addMethod', 
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
    return {error: `An error has occured: ${response.statusText}`};
  }

  return response.data;
}

async function removeGasless(creatorContractAddress: string) {
  const addMethodData = {
    contractAddress: creatorContractAddress,
    method: 'upload',
  };

  const response = await axios.delete('https://api.biconomy.io/api/v1/meta-api/public-api/deleteMethod', 
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        authToken: process.env.BICONOMY_AUTH,
        apiKey: process.env.BICONOMY_API,
      },
      data: new URLSearchParams(addMethodData),
    }
  );

  if(response.status != 200){
    return {error: `An error has occured: ${response.statusText}`};
  }

  return response.data;
}

export default routes;