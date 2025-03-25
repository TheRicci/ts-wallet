import React ,{useState,useEffect} from 'react';
import {render, Box, Text,useFocus, useInput } from 'ink';
import TextInput from 'ink-text-input';
import inquirer from 'inquirer';
import inquirerFileTreeSelection from 'inquirer-file-tree-selection-prompt';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { info } from 'console';

type coin = {symbol:string, address:string};

type PageType = "home" | "transfer" ;

const coinsMap: Map<number, [coin]> = new Map([
	[1,[{symbol:"USDC", address:"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"}]],
	[137,[{symbol:"USDC", address:"0x3c499c542cef5e3811e1192ce70d8cc03d5c3359"}]],
	[56,[{symbol:"USDC", address:"0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d​"}]]
]);

enum symbolToNetwokID {
	ETHER=1,
	MATIC=137,
	BSC=56
  }

interface infoTxProp{
	balance: number,
	contract?: string
}
interface routingProp{
	setPage: React.Dispatch<React.SetStateAction<pageState>>
}

interface pageState{
	page: PageType,
	infoTx?: infoTxProp
}

const Coin: React.FC<{symbol:string, address?:string, rP:routingProp, w:ethers.Wallet|ethers.HDNodeWallet}> = ({symbol,address,rP,w}) => {
	const { isFocused } = useFocus();
	const [balance, setBalance] = useState(0.0);
	const [color, setColor] = useState("");

	useEffect(() => {/*
		const timer = setTimeout(() => {
			if (address){
				// check erc-20 token balance
			}
			// check native token balance
		  }, 30000);
	  
		  return () => clearTimeout(timer); 
		  */
	},[]);

	useEffect(() => {
		if (isFocused){
			setColor("green");
		}else{
			setColor("black");
		}
	},[isFocused])
	
    useInput((input, key) => {
        if (isFocused && key.return) {
            console.log(`Enter key pressed ${symbol}`);
			rP.setPage({page:"transfer",infoTx:{balance:balance,contract:address}});
        }
    });

	return (
		<Box margin={1} borderStyle={"round"} borderColor={`${color}`} justifyContent="space-around" >
			<Text>{symbol} {balance}</Text>
		</Box>
	);
}

const Home: React.FC<{rP:routingProp,w:ethers.Wallet|ethers.HDNodeWallet,ID:number}> = ({rP,w,ID}) => {
	
	return(
		<Box marginTop={1} borderStyle={"round"} borderColor={"magenta"} flexDirection="column">
			<Box>
				<Coin symbol={symbolToNetwokID[ID]as string} rP={rP} w={w}/>
			</Box>
			<Box margin={1} borderStyle={"round"} borderColor={"black"}>
				{coinsMap.get(ID)?.map((item, index) => (
					<Coin key={index} symbol={item.symbol} address={item.address} rP={rP} w={w}/>
				))}
			</Box>
		</Box>
	);
};

const Transfer: React.FC<{rP:routingProp,w:ethers.Wallet|ethers.HDNodeWallet}> = ({rP,w}) => {

	return(
		<Box marginTop={1}>
			<Text>Transfer</Text>
		</Box>
	);
};

const App = ({wallet, networkID}:{wallet:ethers.Wallet|ethers.HDNodeWallet,networkID:number}) => {
	const [page, setPage] = useState<pageState>({page:"home"});
	
	const pages: Record<PageType, JSX.Element> = {
		home: <Home rP={{setPage}} w={wallet} ID={networkID}/>,
		transfer: <Transfer rP={{setPage}} w={wallet}/>,
    };
	return(
		<Box height="100%">{pages[page.page]}</Box>
	);
}

(async () => {   
	inquirer.registerPrompt('file-tree-selection', inquirerFileTreeSelection);
	let wallet:ethers.Wallet | ethers.HDNodeWallet;
	
	const answers = await inquirer.prompt([
		{
			type: 'confirm',
			name: 'new',
			message: 'Create new wallet?',
			default: false
		},
		{
			type: 'file-tree-selection',
			name: 'foulder',
			message: 'Select a foulder',
			root: '/',  
			onlyShowDir: true,
			when: (answers:any) => answers.new
		},
		{
			type: 'file-tree-selection',
			name: 'file',
			message: 'Select a file',
			root: '/',  
			onlyShowDir: false,
			when: (answers:any) => !answers.new
		},
		{
            type: 'password',
            name: 'password',
            message: 'Enter your password:',
            mask: '🧙',
        }
	  ]);
	let password = answers.password as string;
	if (answers.new) {
		wallet = ethers.Wallet.createRandom()
		const encryptedJson = await wallet.encrypt(password);
 		fs.writeFileSync(path.join(answers.foulder,`${wallet.address.substring(0, 9)}_keystore.json`), encryptedJson, 'utf-8');
	}else{
		let path = answers.file as string;
		console.log(path,password);	
		const encryptedJson = fs.readFileSync(path, 'utf-8');
		wallet = await ethers.Wallet.fromEncryptedJson(encryptedJson, password); //check errors
	}
	
	console.clear()
	
	const provider = new ethers.JsonRpcProvider(""); //setup env
	const network = await provider.getNetwork()
	render(
		<App wallet={wallet.connect(provider)} networkID={Number(network.chainId)}/>
		,{exitOnCtrlC:true}
	);
	//console.clear() //on prod
})();
  
