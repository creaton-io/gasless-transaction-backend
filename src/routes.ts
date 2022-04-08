import 'dotenv/config';
import { Router } from 'express';
import { ethers, Contract } from "ethers";
import { BaseProvider } from '@ethersproject/providers';
import creaton_contracts from './contracts';
import { getCreators, ICreator } from './datasources/subgraph';
import { addGasless, removeGasless } from './datasources/biconomy';

const routes = Router();

/**
 * Gets all exisiting creators and sets their gasless settings according to our rules
 */
routes.get('/gaslessCheck', async (req, res) => {
  const users: ICreator[] = await getCreators();

  const added = [];
  const removed = [];
  const method = 'upload';
  for(let a of users){
    if(await holdsEnoughCreateToken(a["user"])){
      added.push(a["user"]);
      addGasless('Creator', a['creatorContract'], method);
    }else{
      removed.push(a["user"]);
      removeGasless(a['creatorContract'], method);
    }
  }

  return res.json({added, removed});
});

/**
 * Enables gasless transactions for a Creator-upload method according to our rules
 */
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
  if(await holdsEnoughCreateToken(walletAddress)){
    return res.json(addGasless('Creator', creatorContractAddress, method));
  }else{
    return res.json(removeGasless(creatorContractAddress, method));
  }
});

/**
 * Checks if the provided wallet Address holds enough (> configured threshold) of CREATE tokens
 * 
 * @param walletAddress 
 * @returns 
 */
async function holdsEnoughCreateToken(walletAddress: string){
  const tokenAddress: string = process.env.TOKEN_ADDRESS || '';
  const threshold: string = process.env.TOKEN_AMOUNT_THRESHOLD || '0';

  const provider: BaseProvider = ethers.getDefaultProvider();
  const contract: Contract = new ethers.Contract(tokenAddress, creaton_contracts.erc20.abi, provider);
  const balance: string = (await contract.balanceOf(walletAddress)).toString();

  return (balance >= threshold);
}

/**
 * Configures a contract + method to be used as gasless
 */
routes.post('/gaslessContractAndMethod', async (req, res) => { 
  const contractName: string = req.body.contractName;
  const contractAddress: string = req.body.contractAddress;
  const method: string = req.body.method;

  return res.json(addGasless(contractName, contractAddress, method));
});

export default routes;