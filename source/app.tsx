import React ,{useState,useEffect} from 'react';
import {render, Box, Text,useFocus, useInput } from 'ink';
import TextInput from 'ink-text-input';
import inquirer from 'inquirer';
import inquirerFileTreeSelection from 'inquirer-file-tree-selection-prompt';
import { ethers, id } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from "dotenv";
import os from "os";
import open from 'open';
import { setTimeout } from "timers/promises";

dotenv.config(); 

type PageType = "home" | "transfer" ;
type coin = {symbol:string, address:string,decimal:number};

type networkINFO = {name:string, symbol:string, apiAddress:string, apiKey:string,provider:string,explorer:string};
const networkMAP: Map<number, networkINFO> = new Map([
	[1,{name:"Ethereum",symbol:"ETHER",apiAddress:"https://api.etherscan.io/api", apiKey:process.env["ETHERSCAN_API_KEY"]??"",provider:process.env["ETHER_PROVIDER"]??"",explorer:"https://etherscan.io" }],
	[137,{name:"Polygon",symbol:"MATIC",apiAddress:"https://api.polygonscan.com/api", apiKey:process.env["POLYGONSCAN_API_KEY"]??"",provider:process.env["POLYGON_PROVIDER"]??"",explorer:"https://polygonscan.com" }],
	[56,{name:"BinanceChain",symbol:"BNB",apiAddress:"https://api.bscscan.com/api", apiKey:process.env["BSCSCAN_API_KEY"]??"",provider:process.env["ETHERSCAN_API_KEY"]??"",explorer:"https://bscscan.com"  }],
	[42161,{name:"Arbitrum",symbol:"ARB",apiAddress:"https://api.arbiscan.io/api", apiKey:process.env["ARBISCAN_API_KEY"]??"",provider:process.env["BSC_PROVIDER"]??"" ,explorer:"https://www.arbiscan.io" }],
	[11155111,{name:"Sepolia",symbol:"SepoliaETH",apiAddress:"https://api-sepolia.etherscan.io/api", apiKey:process.env["ETHERSCAN_API_KEY"]??"",provider:process.env["SEPOLIA_PROVIDER"]??"",explorer:"https://sepolia.etherscan.io"  }] //testnet
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
		const interval = setInterval(balanceCheck, 20000);
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
			if (item.value == "0"){return}
			if (item.from == w.address.toLowerCase()){
				return <Text key={index} color={"red"}>{ethers.formatUnits(String(item.value), item.tokenDecimal?Number(item.tokenDecimal):18)} {item.tokenSymbol? item.tokenSymbol: String(networkMAP.get(ID)?.symbol)} 🢥 {item.to.substring(0,9)}</Text>
			}
			return <Text key ={index} color={"green"}>{ethers.formatUnits(String(item.value), item.tokenDecimal?Number(item.tokenDecimal):18)} {item.tokenSymbol? item.tokenSymbol: String(networkMAP.get(ID)?.symbol)} 🢦 {item.from.substring(0,9)}</Text>
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
				{logs && transactions()}
			</Box>
		</Box>
	);
};

const Input = ({text,value,setValue,invalid,setBlock}:{text:string,value:string,setValue:React.Dispatch<React.SetStateAction<string>>,invalid:boolean,setBlock?:React.Dispatch<React.SetStateAction<boolean>>}) => {
	const [color, setColor] = useState("");
	const { isFocused } = useFocus();

	useEffect(() => {
		if (isFocused){
			if (setBlock){setBlock(true)}
			(invalid?setColor("red"):setColor("blue"))
			return
		}
		if (setBlock){setBlock(false)}
		setColor("black")
	},[isFocused,invalid])
	return(
		<Box borderStyle={"round"} borderColor={color} marginTop={1} width={'95%'} >
			<Text>{text}:  </Text>
			<TextInput value={value} onChange={setValue} focus={isFocused} showCursor={true}></TextInput>
		</Box>
	);
}

const Send = ({amount,address,setTx,txInfo,w,tx}:
	{amount:string,address:string,setTx:React.Dispatch<React.SetStateAction<any>>,txInfo:infoTxProp,w:ethers.Wallet|ethers.HDNodeWallet,tx:any}) => {
	const [color, setColor] = useState("");
	const { isFocused } = useFocus();
	const [blocked, setBlock] = useState(true)

	useEffect(() => {
			if ((amount && address) && Number(amount) < Number(txInfo.balance)){setBlock(false);setColor("green");return}
			isFocused?setColor("red"):setColor("grey")
		},[isFocused])
	
	useInput((input, key) => {
		if (isFocused && key.return) {
			if (blocked){return}
			if (txInfo.contract){
				const contract = new ethers.Contract(txInfo.contract, ERC20_ABI, w) as any 
				contract.transfer(address, ethers.parseUnits(amount, txInfo.decimal)) 
					.then((tx:any ) => {
					//console.log("Transaction sent! Hash:", tx.hash);
					setTx(tx)})
				return
			}
			w.sendTransaction({
				to:address,
				value: ethers.parseEther(amount), // Convert ETH to Wei
			}).then((tx:any) => {
				//console.log("Transaction sent! Hash:", tx.hash);
				setTx(tx)
			})
		}
	});

	useEffect(() =>{
		if(tx){setBlock(true);return}
		setBlock(false)
	},[tx])

	return(
		<Box marginTop={1} borderStyle={'round'} borderColor={color} width={'33%'} justifyContent='center' >
			<Text>SEND</Text>
		</Box>
	);
	
};

const ReceiptComponent = ({tx,receipt,chainID}:{tx:any|undefined,receipt:any|undefined,chainID:number}) => {
	const { isFocused } = useFocus();
	const [color, setColor] = useState("");

	useEffect(() => {
		isFocused? setColor("magenta") :setColor("blue") 
	},[isFocused])
	
	useInput((input, key) => {
		if (isFocused && key.return && (tx || receipt)) {
			open(`${networkMAP.get(chainID)?.explorer}/tx/${tx?tx.hash:receipt.hash}`); 
		}
	});

	return(
		<Box flexDirection='column' width={'50%'} alignItems='center' borderStyle={'round'} borderColor={color} >
		{tx && <Box justifyContent='center' flexDirection='column' alignItems='center' width={'90%'}>
				<Text>Tx Hash: {tx.hash}</Text> 
				<Text>TX SENT</Text>
				<Text>Awainting Confirmation...</Text>
			</Box>}
			{receipt && <Box justifyContent='center' flexDirection='column' alignItems='center' width={'90%'}> 
				<Text>Tx Hash: {receipt.hash}</Text> 
				<Text>Tx confirmed at block: {receipt.blockNumber}</Text>
				<Text>Gas used: {receipt.gasUsed}</Text>
			</Box>}
		</Box>
	);
};

const Transfer: React.FC<{rP:routingProp,w:ethers.Wallet|ethers.HDNodeWallet,txInfo:infoTxProp|undefined,chainID:number,bI:boolean,setBI:React.Dispatch<React.SetStateAction<boolean>>}> = 
	({rP,w,txInfo,chainID,bI,setBI}) => {
	if (!txInfo){
		return <Text>something weird happened.</Text>
	}
	const [address, setAddress] = useState("");
	const [uncheckAddress, setUncheckedAddress] = useState("");
	const [amount, setAmount] = useState("");
	const [tx, setTx] = useState<any|undefined>();
	const [receipt, setReceipt] = useState<any|undefined>();
	const [gasPrice, setGasPrice] = useState<any>();
	const [invalid, setInvalid] = useState<boolean>(false);
	const [Insufficient, setInsufficient] = useState<boolean>(false);
	const [balance, setBalance] = useState(txInfo.balance);

	//const contract:any|undefined = txInfo.contract?new ethers.Contract(txInfo.contract??"", ERC20_ABI, w) as any : undefined   //gas func

	useEffect(() => {
		if (!amount) {
			setInsufficient(false)
			return
		}
		(Number(amount) <= Number(balance))? setInsufficient(false) : setInsufficient(true);
	},[amount])

	useEffect(()=>{
		if (!uncheckAddress) {
			setInvalid(false)
			return
		}
		ethers.isAddress(uncheckAddress)? (setAddress(uncheckAddress),setInvalid(false)) : setInvalid(true);
	},[uncheckAddress])

	useEffect(()=>{
		if (!tx){return}
		setTimeout(5000).then(
			tx.wait() 
			.then((receipt:any) => { 
				setAmount("");setAddress("");setUncheckedAddress("")
				//console.log("Transaction confirmed in block:", receipt.blockNumber);
				//console.log("Gas Used:", receipt.gasUsed.toString());
				//console.log("Transaction Success:", receipt.status === 1?"success":"failed");
				setReceipt(receipt)
				setBalance(balance - Number(ethers.formatUnits(tx.value, Number(txInfo.decimal??18))))
				setTx(undefined)
			}).catch((error:any) => {
					console.error("Error during transaction:", error);
				})
		)
	},[tx]) 

	useInput((input, key) => {
		if (bI){return}
		if (input == "r") {
			setReceipt(undefined)
			rP.setState({page:"home"})
			return
		}
		if (input =="q") {
			console.clear()
			process.exit()
		}
	});

	/*
	useEffect(()=>{
		if (address && amount){
			if (txInfo.contract){
				contract.estimateGas.transfer(address, amount) //parse
				.then((gasLimit:any) => {
					console.log(`Estimated Gas Limit for ERC-20 Transfer: ${gasLimit.toString()}`);
					w.provider?.getFeeData()
					.then(gasData => {
						const gasPrice = gasData.gasPrice!;
						const gasCost = Number(gasLimit) * Number(gasPrice.toString);
						setGasPrice(ethers.formatEther(gasCost))
						console.log(`Total Cost in ETH: ${gasCost} ETH`);
					})
				})
				.catch((err:any) => console.error("Error estimating gas:", err));
				return
			}
			w.estimateGas({ to:address, value:ethers.parseEther(amount) })
			.then(gasLimit => {
				console.log(`Estimated Gas Limit: ${gasLimit.toString()}`);
				w.provider?.getFeeData()
					.then(gasData => {
						const gasPrice = gasData.gasPrice!;
						const gasCost = gasLimit * gasPrice;
						setGasPrice(ethers.formatEther(gasCost))
						console.log(`Total Cost in ETH: ${gasCost} ETH`);
					})
				.catch(err => console.error("Error fetching gas price:", err));
			})
			.catch(err => console.error("Error estimating gas:", err));
		}
	},[address,amount])

	{invalid && <Text color='red'>invalid</Text>}
	{Insufficient && <Text color='red'>insufficient</Text>}
	*/
	return(		
		<Box width={'100%'}>
			<Text>Balance: {balance}</Text>
			<Box flexDirection='column' width={'50%'} alignItems='center' >
				<Box width={'100%'} flexDirection='column' alignItems='center' justifyContent='center'>
					<Input text={"Address"} value={uncheckAddress} setValue={setUncheckedAddress} invalid={invalid} setBlock={setBI}/> 
					{invalid && <Text color='red'>Invalid Address</Text>}
				</Box>
				<Box width={'100%'} flexDirection='column' alignItems='center' justifyContent='center'>
					<Input text={"Amount"} value={amount} setValue={setAmount} invalid={Insufficient}/> 
					{Insufficient && <Text color='red'>Insufficient Funds</Text>}
				</Box>
				<Box marginTop={1} marginBottom={1}></Box>
				<Send w={w} amount={amount} address={address} setTx={setTx} txInfo={txInfo} tx={tx}></Send>
			</Box>
			{(tx||receipt) && <ReceiptComponent tx={tx} receipt={receipt} chainID={chainID} />}
		</Box>
	);
};

const App = ({wallet, chainID}:{wallet:ethers.Wallet|ethers.HDNodeWallet,chainID:number}) => {
	const [page, setPage] = useState<pageState>({page:"home"});
	const [logs, setLogs] = useState<any[]>([]);
	const [coins, setCoins] = useState<coin[]>([]);
	const [blockInput, setBlockInput] = useState(false);

	const checkLogs = () => {
		const erc20TxUrl = `${networkMAP.get(chainID)?.apiAddress}?module=account&action=tokentx&address=${wallet.address}&startblock=0&endblock=99999999&sort=asc&apikey=${networkMAP.get(chainID)?.apiKey}`;
		const ethTxUrl = `${networkMAP.get(chainID)?.apiAddress}?module=account&action=txlist&address=${wallet.address}&startblock=0&endblock=99999999&sort=asc&apikey=${networkMAP.get(chainID)?.apiKey}`;
		
		Promise.all([	//otherwise we would have to iter through all blocks
			fetch(ethTxUrl).then(response => response.json()),
			fetch(erc20TxUrl).then(response => response.json())
			]).then(([ethData, erc20Data]) => {
			const ethTransactions = ethData.result || [];
			//console.log(ethTransactions)
			const erc20Transactions = erc20Data.result || [];
			//console.log(ethTransactions)
			// Merge transactions into a single array
			const allTransactions = [...ethTransactions, ...erc20Transactions];
		
			// Sort by timestamp (ascending)
			allTransactions.sort((a, b) => Number(a.timeStamp) - Number(b.timeStamp));
			
			setLogs(allTransactions)
			//console.log(allTransactions)
			})
			.catch(error => console.error(`Error fetching transactions for ${chainID}:`, error));
	};

	useInput((input, key) => {
		if (blockInput){return}
		if (input =="q") {
			console.clear()
			process.exit()
		}
	});
	
	useEffect(()=>{
		checkLogs()
		setInterval(checkLogs,20000)
	},[])

	useEffect(()=>{
		let coinsMap:Map<string,boolean> = new Map;
		let coins: coin[] = [];
		logs.map(item =>{
			if (item.tokenSymbol && item.contractAddress && item.tokenDecimal){
				if (!coinsMap.has(item.tokenSymbol)){
					coinsMap.set(item.tokenSymbol, true)
					coins.push({symbol:item.tokenSymbol,address:item.contractAddress,decimal:item.tokenDecimal})
				}
			}
		})
		setCoins(coins)
	},[logs])

	const pages: Record<PageType, JSX.Element> = {
		home: <Home rP={{setState: setPage}} w={wallet} ID={chainID} logs={logs} coins={coins}/>,
		transfer: <Transfer rP={{setState: setPage}} w={wallet} txInfo={page.infoTx} chainID={chainID} bI={blockInput} setBI={setBlockInput}/>,
    };
	return(
		<Box flexDirection={"column"} width={"100%"} height={"100%"}>
			<Box flexDirection={"column"}>
					<Text>Network: {String(networkMAP.get(chainID)?.name)}</Text> 
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
		<App wallet={wallet.connect(provider)} chainID={Number(network.chainId)}/>
		,{exitOnCtrlC:true}
	);
	//console.clear() 
})();
  
