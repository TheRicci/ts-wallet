import React ,{useState,useEffect} from 'react';
import {render, Box, Text,useFocus, useInput } from 'ink';
import TextInput from 'ink-text-input';
import inquirer from 'inquirer';
import inquirerFileTreeSelection from 'inquirer-file-tree-selection-prompt';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

type PageType = "home" | "transfer" ;

type coin = {symbol:string, address:string};
const coinsMap: Map<number, [coin]> = new Map([
	[1,[{symbol:"USDC", address:"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"}]],
	[137,[{symbol:"USDC", address:"0x3c499c542cef5e3811e1192ce70d8cc03d5c3359"}]],
	[56,[{symbol:"USDC", address:"0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"}]],
	//[42161,[{symbol:"USDC", address:"0xaf88d065e77c8cC2239327C5EDb3A432268e5831​"}]],
	[11155111,[{symbol:"USDC", address:"0x779877A7B0D9E8603169DdbD7836e478b4624789"}]] //testnet
	
]);

const ERC20_ABI = [
	"function balanceOf(address owner) view returns (uint256)",
	"function transfer(address to, uint256 amount) public returns (bool)"
  ]as const;


enum symbolToNetwokID {
	ETHER=1,
	MATIC=137,
	BSC=56,
	SepoliaETH=11155111
}

enum nameToNetwokID {
	Ethereum=1,
	Polygon=137,
	BinanceChain=56,
	Sepolia=11155111
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
	
	useEffect(() => {
		let timer: NodeJS.Timeout;
		let balanceCheck: () => void;
			if (address){
				const contract = new ethers.Contract(address, ERC20_ABI, w) as any // check erc-20 token balance
				balanceCheck = () =>{
					contract.balanceOf(w.address).then((balance:any) => {
						setBalance(Number(ethers.formatUnits(balance, 18)));
					});
				};
			}else{
				balanceCheck = () => {
					w.provider?.getBalance(w.address).then((balance) => {
						setBalance(Number(ethers.formatEther(balance)));
					});
				}
			}
		balanceCheck();
		const interval = setInterval(balanceCheck, 30000);
		return () => clearInterval(interval); 
	},[]);

	useEffect(() => {
		if (isFocused){
			setColor("green");
		}else{
			setColor("black");	
		}
		console.clear() 
		//console.log(balance);
	},[isFocused])
	
    useInput((input, key) => {
        if (isFocused && key.return) {
            console.log(`Enter key pressed ${symbol}`);
			rP.setPage({page:"transfer",infoTx:{balance:balance,contract:address}});
        }
    });

	return (
		<Box marginRight={1} marginLeft={1} borderStyle={"round"} borderColor={`${color}`} justifyContent={"space-between"} >
			<Text>{symbol} </Text>
			<Text>{balance}</Text>
		</Box>
	);
}

const Home: React.FC<{rP:routingProp,w:ethers.Wallet|ethers.HDNodeWallet,ID:number}> = ({rP,w,ID}) => {
	
	return(
		<Box  flexDirection={"column"} justifyContent={"center"}  width={"100%"} >
			<Text>Network: {nameToNetwokID[ID]}</Text> 
			<Text>ADDRESS: {w.address}</Text> 
			<Box marginTop={1} padding={1} borderStyle={"round"} borderColor={"magenta"} flexDirection={"column"} width={"33%"} >
				<Box marginLeft={1} justifyContent={"space-between"}>
					<Text color={"magentaBright"}>Symbol </Text>
					<Text color={"magentaBright"}>Balance</Text>
				</Box>
				<Coin symbol={symbolToNetwokID[ID]as string} rP={rP} w={w}/>
			
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
		<Box height={"100%"} width={"100%"} justifyContent={"center"} >{pages[page.page]}</Box>
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
		const encryptedJson = fs.readFileSync(path, 'utf-8');
		wallet = await ethers.Wallet.fromEncryptedJson(encryptedJson, password); //check errors
	}
	
	console.clear()
	
	//wallet = ethers.Wallet.createRandom()

	//const provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com"); //setup env
	const provider = new ethers.JsonRpcProvider("https://sepolia.drpc.org");
	const network = await provider.getNetwork()
	render(
		<App wallet={wallet.connect(provider)} networkID={Number(network.chainId)}/>
		,{exitOnCtrlC:true}
	);
	//console.clear() //on prod
})();
  
