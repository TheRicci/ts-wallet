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
	setState: React.Dispatch<React.SetStateAction<pageState>>
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
		const interval = setInterval(balanceCheck, 10000);
		return () => clearInterval(interval); 
	},[]);

	useEffect(() => {
		isFocused? setColor("green"):setColor("black")
		console.clear() 
	},[isFocused])
	
    useInput((input, key) => {
        if (isFocused && key.return) {
			rP.setState({page:"transfer",infoTx:{balance:balance,contract:address}});
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
		<Box flexDirection={"column"} justifyContent={"center"}  width={"100%"} >
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

const Input = ({text,value,setValue}:{text:string,value:string,setValue:React.Dispatch<React.SetStateAction<string>>}) => {
	const [color, setColor] = useState("");
	const { isFocused } = useFocus();

	useEffect(() => {
		isFocused? setColor("green"):setColor("black")
		console.clear() 
	},[isFocused])
	return(
		<Box borderStyle={"round"} borderColor={`${color}`} marginTop={1} >
			<Text>{text}: </Text>
			<TextInput value={value} onChange={setValue} focus={isFocused} showCursor={true}></TextInput>
		</Box>
	);
}

const Send = ({amount,address,setTx,txInfo,w}:
	{amount:string,address:string,setTx:React.Dispatch<React.SetStateAction<any>>,txInfo:infoTxProp,w:ethers.Wallet|ethers.HDNodeWallet}) => {
	const [color, setColor] = useState("");
	const { isFocused } = useFocus();
	const [blocked, setBlock] = useState(true)

	useEffect(() => {
			if ((amount && address) && Number(amount) < Number(txInfo.balance)){setBlock(false);setColor("green");return}
			isFocused?setColor("red"):setColor("black")
		},[isFocused])
	
	useInput((input, key) => {
		if (isFocused && key.return) {
			if (blocked){return}
			if (txInfo.contract){
				const contract = new ethers.Contract(address, ERC20_ABI, w) as any 
				contract.transfer(address, ethers.parseUnits(amount, 8)) // check decimals
					.then((tx:any ) => {
					console.log("Transaction sent! Hash:", tx.hash);
					setTx(tx)})
				return
			}
			w.sendTransaction({
				to:address,
				value: ethers.parseEther(amount), // Convert ETH to Wei
			}).then((tx:any ) => {
				console.log("Transaction sent! Hash:", tx.hash);
				setTx(tx)
			})
		}
	});

	return(
		<Box marginTop={1} borderStyle={'round'} borderColor={color}>
			<Text>SEND</Text>
		</Box>
	);
	
};

const Transfer: React.FC<{rP:routingProp,w:ethers.Wallet|ethers.HDNodeWallet,txInfo:infoTxProp|undefined}> = ({rP,w,txInfo}) => {
	if (!txInfo){
		return <text>something weird happened.</text>
	}
	const [address, setAddress] = useState("");
	const [amount, setAmount] = useState("");
	const [tx, setTx] = useState<any|undefined>();

	useEffect(()=>{
		if (!tx){return}
		tx.wait()
			.then((receipt:any) => { 
			console.log("Transaction confirmed in block:", receipt.blockNumber);
			console.log("Gas Used:", receipt.gasUsed.toString());
			console.log("Transaction Success:", receipt.status === 1?"success":"failed");
			})
			.catch((error:any) => {
			console.error("Error during transaction:", error);
			});
	},[tx]) 

	useInput((input, key) => {
		if (input == "r") {
			//return to home
		}});

	return(
		//<Text>gas now: </Text> 
		<Box flexDirection='column'>
			<Input text={"Address"} value={address} setValue={setAddress}/>
			<Input text={"Amount"} value={amount} setValue={setAmount}/>
			<Box marginTop={1}>
				
			</Box>
			<Send w={w} amount={amount} address={address} setTx={setTx} txInfo={txInfo}></Send>
		</Box>
	);
};

const App = ({wallet, networkID}:{wallet:ethers.Wallet|ethers.HDNodeWallet,networkID:number}) => {
	const [page, setPage] = useState<pageState>({page:"home"});
	
	const pages: Record<PageType, JSX.Element> = {
		home: <Home rP={{setState: setPage}} w={wallet} ID={networkID}/>,
		transfer: <Transfer rP={{setState: setPage}} w={wallet} txInfo={page.infoTx}/>,
    };
	return(
		<Box height={"100%"} width={"100%"} justifyContent={"center"} flexDirection={"column"} >
			{pages[page.page]}
			<Text>TAB ➤ MOVE |🧙| R ➤ return |🧙| Q ➤ quit</Text>
		</Box>
	);
}

(async () => {   
	inquirer.registerPrompt('file-tree-selection', inquirerFileTreeSelection);
	let wallet:ethers.Wallet | ethers.HDNodeWallet;
	/*
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
	*/
	wallet = ethers.Wallet.createRandom()
	//const provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com"); //setup env
	const provider = new ethers.JsonRpcProvider("https://sepolia.drpc.org");
	const network = await provider.getNetwork()
	render(
		<App wallet={wallet.connect(provider)} networkID={Number(network.chainId)}/>
		,{exitOnCtrlC:true}
	);
	//console.clear() //on prod
})();
  
