import React ,{useState,useEffect} from 'react';
import {render, Box, Text,useFocus, useInput } from 'ink';
import TextInput from 'ink-text-input';
import inquirer from 'inquirer';
import inquirerFileTreeSelection from 'inquirer-file-tree-selection-prompt';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from "dotenv";
import os from "os";


dotenv.config(); 

type PageType = "home" | "transfer" ;
type coin = {symbol:string, address:string,decimal:number};

type networkINFO = {name:string, symbol:string, apiAddress:string, apiKey:string,provider:string};
const networkMAP: Map<number, networkINFO> = new Map([
	[1,{name:"Ethereum",symbol:"ETHER",apiAddress:"https://api.etherscan.io/api", apiKey:process.env["ETHERSCAN_API_KEY"]??"",provider:process.env["ETHER_PROVIDER"]??"" }],
	[137,{name:"Polygon",symbol:"MATIC",apiAddress:"https://api.polygonscan.com/api", apiKey:process.env["POLYGONSCAN_API_KEY"]??"",provider:process.env["POLYGON_PROVIDER"]??""}],
	[56,{name:"BinanceChain",symbol:"BNB",apiAddress:"https://api.bscscan.com/api", apiKey:process.env["BSCSCAN_API_KEY"]??"",provider:process.env["ETHERSCAN_API_KEY"]??"" }],
	[42161,{name:"Arbitrum",symbol:"ARB",apiAddress:"https://api.arbiscan.io/api", apiKey:process.env["ARBISCAN_API_KEY"]??"",provider:process.env["BSC_PROVIDER"]??"" }],
	[11155111,{name:"Sepolia",symbol:"SepoliaETH",apiAddress:"https://api-sepolia.etherscan.io/api", apiKey:process.env["ETHERSCAN_API_KEY"]??"",provider:process.env["SEPOLIA_PROVIDER"]??"" }] //testnet
]);

const ERC20_ABI = [
	"function balanceOf(address owner) view returns (uint256)",
	"function transfer(address to, uint256 amount) public returns (bool)"
  ]as const;

interface infoTxProp{
	balance: number,
	contract?: string,
	decimal?: number
}
interface routingProp{
	setState: React.Dispatch<React.SetStateAction<pageState>>
}

interface pageState{
	page: PageType,
	infoTx?: infoTxProp
}

const Coin: React.FC<{symbol:string, address?:string, rP:routingProp, w:ethers.Wallet|ethers.HDNodeWallet, decimal?:number}> = ({symbol,address,rP,w,decimal}) => {
	const { isFocused } = useFocus();
	const [balance, setBalance] = useState(0.0);
	const [color, setColor] = useState("");
	
	useEffect(() => {
		let balanceCheck: () => void;
			if (address){
				const contract = new ethers.Contract(address, ERC20_ABI, w) as any // check erc-20 token balance
				balanceCheck = () =>{
					contract.balanceOf(w.address).then((balance:any) => {
						setBalance(Number(ethers.formatUnits(balance, Number(decimal))));
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
		//console.clear() 
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

const Home: React.FC<{rP:routingProp,w:ethers.Wallet|ethers.HDNodeWallet,ID:number,logs:any[],coins:coin[]}> = ({rP,w,ID,logs,coins}) => {
	useInput((input, key) => {
		if (input =="q") {
			console.clear()
			process.exit()
		}
	});

	const transactions = () =>{
		return logs.map((item,index) => {
			if (item.from == w.address ){
				return <Text key={index} color={"red"}>{ethers.formatUnits(item.value, 18)} {item.tokenSymbol? item.tokenSymbol: String(networkMAP.get(ID)?.symbol)} 🢥 {item.to.substring(0,9)}</Text>
			}
			return <Text key ={index} color={"green"}>{ethers.formatUnits(item.value, 18)} {item.tokenSymbol? item.tokenSymbol: String(networkMAP.get(ID)?.symbol)} 🢦 {item.from.substring(0,9)}</Text>
		})
	}

	return(
		<Box>
			<Box flexDirection={"column"} justifyContent={"center"}  width={"50%"} >
				<Box padding={1} borderStyle={"round"} borderColor={"magenta"} flexDirection={"column"} width={"100%"} >
					<Box marginLeft={1} justifyContent={"space-between"}>
						<Text color={"magentaBright"}>Symbol </Text>
						<Text color={"magentaBright"}>Balance</Text>
					</Box>
					<Coin symbol={String(networkMAP.get(ID)?.symbol)} rP={rP} w={w}/>
				
					{coins.map((item, index) => (
						<Coin key={index} symbol={item.symbol} address={item.address} decimal={item.decimal} rP={rP} w={w}/>
					))}

				</Box>
			</Box>
			<Box flexDirection={"column"} alignItems='center' width={"40%"} marginRight={2} marginLeft={2} >
				{transactions()}
			</Box>
		</Box>
	);
};

const Input = ({text,value,setValue}:{text:string,value:string,setValue:React.Dispatch<React.SetStateAction<string>>}) => {
	const [color, setColor] = useState("");
	const { isFocused } = useFocus();

	useEffect(() => {
		isFocused? setColor("green"):setColor("black")
		//console.clear() 
	},[isFocused])
	return(
		<Box borderStyle={"round"} borderColor={`${color}`} marginTop={1} width={'66%'} >
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
			isFocused?setColor("red"):setColor("blue")
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
			}).then((tx:any) => {
				console.log("Transaction sent! Hash:", tx.hash);
				setTx(tx)
			})
		}
	});

	return(
		<Box marginTop={1} borderStyle={'round'} borderColor={color} width={'33%'} alignItems='center'>
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
			rP.setState({page:"home"})
			return
		}
		if (input =="q") {
			console.clear()
			process.exit()
		}
	});

	return(
		//<Text>gas now: </Text> 
		<Box flexDirection='column' width={'50%'} alignItems='center'>
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
	const [logs, setLogs] = useState<any[]>([]);
	const [coins, setCoins] = useState<coin[]>([]);

	const checkLogs = () => {
		const erc20TxUrl = `${networkMAP.get(networkID)?.apiAddress}?module=account&action=tokentx&address=${wallet.address}&startblock=0&endblock=99999999&sort=asc&apikey=${networkMAP.get(networkID)?.apiKey}`;
		const ethTxUrl = `${networkMAP.get(networkID)?.apiAddress}?module=account&action=txlist&address=${wallet.address}&startblock=0&endblock=99999999&sort=asc&apikey=${networkMAP.get(networkID)?.apiKey}`;
		
		Promise.all([
			fetch(ethTxUrl).then(response => response.json()),
			fetch(erc20TxUrl).then(response => response.json())
			]).then(([ethData, erc20Data]) => {
			const ethTransactions = ethData.result || [];
			const erc20Transactions = erc20Data.result || [];
		
			// Merge transactions into a single array
			const allTransactions = [...ethTransactions, ...erc20Transactions];
		
			// Sort by timestamp (ascending)
			allTransactions.sort((a, b) => Number(a.timeStamp) - Number(b.timeStamp));
			
			setLogs(allTransactions)
			//console.log(allTransactions)
			})
			.catch(error => console.error(`Error fetching transactions for ${networkID}:`, error));
	};

	useEffect(()=>{
		checkLogs()
		setInterval(checkLogs,20000)
	},[])

	useEffect(()=>{
		logs.map(item =>{
			if (item.tokenSymbol && item.contractAddress && item.tokenDecimal){
				console.log(item)
				setCoins([...coins, {symbol:item.tokenSymbol,address:item.contractAddress,decimal:item.tokenDecimal}])
			}
		})
	},[logs])

	const pages: Record<PageType, JSX.Element> = {
		home: <Home rP={{setState: setPage}} w={wallet} ID={networkID} logs={logs} coins={coins} />,
		transfer: <Transfer rP={{setState: setPage}} w={wallet} txInfo={page.infoTx}/>,
    };
	return(
		<Box flexDirection={"column"} width={"100%"} height={"100%"}>
			<Box flexDirection={"column"}>
					<Text>Network: {String(networkMAP.get(networkID)?.name)}</Text> 
					<Text>ADDRESS: {wallet.address}</Text> 
			</Box>
			<Box  flexDirection={"column"}>
				{pages[page.page]}
			</Box>
			<Box justifyContent='center' width={"100%"} marginTop={1} >
				<Text>TAB ➤ MOVE |🧙| R ➤ return |🧙| Q ➤ quit</Text>
			</Box>
		</Box>
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
			root: os.homedir(),  
			onlyShowDir: true,
			when: (answers:any) => answers.new
		},
		{
			type: 'file-tree-selection',
			name: 'file',
			message: 'Select a file',
			root: os.homedir(),  
			onlyShowDir: false,
			when: (answers:any) => !answers.new
		},
		{
            type: 'password',
            name: 'password',
            message: 'Enter your password:',
            mask: '🧙',
        },
		{
            type: 'list',
            name: 'network',
            message: 'Select the network',
            choices:[
				{ name: 'Ethereum', value: 1 },
				{ name: 'Polygon', value: 137 },
				{ name: 'BinanceChain', value: 56 },
				{ name: 'Arbitrum', value: 42161 },
				{ name: 'Sepolia', value: 11155111 }
			  ]
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
	const provider = new ethers.JsonRpcProvider(networkMAP.get(Number(answers.network))?.provider);
	const network = await provider.getNetwork()
	render(
		<App wallet={wallet.connect(provider)} networkID={Number(network.chainId)}/>
		,{exitOnCtrlC:true}
	);
	//console.clear() 
})();
  
