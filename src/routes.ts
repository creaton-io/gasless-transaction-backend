import 'dotenv/config';
import { Router } from 'express';
import { ethers, Contract } from "ethers";
import erc20 from './abi/erc20.json';
import { BaseProvider } from '@ethersproject/providers';

const routes = Router();

routes.get('/gasless/:walletAddress/:creatorContractAddress', async (req, res) => {
  const tokenAddress: string = process.env.TOKEN_ADDRESS || '';
  const threshold: string = process.env.TOKEN_AMOUNT_THRESHOLD || '0';
  const walletAddress: string = req.params.walletAddress;
  const creatorContractAddress: string = req.params.creatorContractAddress;

  try {
    ethers.utils.getAddress(tokenAddress);
    ethers.utils.getAddress(walletAddress);
    ethers.utils.getAddress(creatorContractAddress);
  } catch (e) {
    return res.json({error: e});
  }

  const provider: BaseProvider = ethers.getDefaultProvider();
  const contract: Contract = new ethers.Contract(tokenAddress, erc20.abi, provider);
  const balance: string = (await contract.balanceOf(walletAddress)).toString();

  if(balance > threshold){
    return res.json(addGasless(creatorContractAddress));
  }

  return res.json({balance, gassless: (balance > threshold)});
});

async function addGasless(creatorContractAddress: string) {
    const addMethodData = {
      apiType: 'native',
      methodType: 'write',
      name: 'upload' + creatorContractAddress.slice(2, 6),
      contractAddress: creatorContractAddress,
      method: 'upload',
    };

    const response = await fetch('https://api.biconomy.io/api/v1/meta-api/public-api/addMethod', {
      method: 'POST', // or 'PUT'
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        authToken: process.env.BICONOMY_AUTH,
        apiKey: process.env.BICONOMY_API,
      },
      body: new URLSearchParams(addMethodData),
    });

    if(!response.ok){
      return {error: `An error has occured: ${response.status}`};
    }

    return response.json();
  }

export default routes;