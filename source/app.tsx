import React ,{useState} from 'react';
import { Form } from 'ink-form';
import {render, Box, Text} from 'ink';
import TextInput from 'ink-text-input';
import inquirer from 'inquirer';
import inquirerFileTreeSelection from 'inquirer-file-tree-selection-prompt';

type PageType = "home" | "file" | "password";

/*
interface fileQueryProps {
	path: string;
	setPage: (page: PageType) => void;
}
*/

interface stringStateProp {
	setString: React.Dispatch<React.SetStateAction<string>>; 
}

interface routingProp{
	setPage: React.Dispatch<React.SetStateAction<PageType>>
}

const FileQuery: React.FC<{path:string, rP:routingProp, sSP:stringStateProp}> = ({path,rP,sSP}) => {    
	const [query, setQuery] = useState(path);
	
	return (
	  <Box>
		<Box marginRight={1}>
		  <Text>Enter JSON file path: </Text>
		  <TextInput value={query} onChange={setQuery} onSubmit={() => {sSP.setString(query),rP.setPage("password")}} />			
		</Box>
	  </Box>
	);
};

const PasswordQuery: React.FC<{path:string, rP:routingProp}> = ({path,rP}) => {
	const [password, setPassword] = useState('');

	return (
		<Box>
			<Box marginRight={1}>
				<Text>Password: </Text>
				<TextInput value={password} onChange={setPassword} 
					onSubmit={() => {
						console.log(path,password)
						// check path and passowrd

						rP.setPage("home")
						}}  />
			</Box>
		</Box>
	);
}

const Home = () => {
	return(
		<Text>Home</Text>
	);
};

const App = ({path}:{path: string }) => {
	const [page, setPage] = useState<PageType>("file");
	const [confirmedPath, setPath]  = useState(path);

	const pages: Record<PageType, JSX.Element> = {
		home: <Home />,
        file: <FileQuery path={path} rP={{setPage}} sSP={{setString:setPath}} />,
        password: <PasswordQuery path={confirmedPath} rP={{setPage}} />,
    };
	return(
		<Box flexDirection="column">{pages[page]}</Box>
	);
}

(async () => {
	inquirer.registerPrompt('file-tree-selection', inquirerFileTreeSelection);
	const answer = await inquirer.prompt([
		{
			type: 'file-tree-selection',
			name: 'file',
			message: 'Select a file',
			root: '/',  
			onlyShowDir: false,   
		}
	  ]);
	let path = answer.file as string;
	render(
		<App path={path}/>
		,{exitOnCtrlC:true});
})();
  


/*
	<Form
	onSubmit={value => console.log(`Submitted: `, value)}
	form={{
		title: "Form title",
		sections: [
		{
			title: "Text fields",
			fields: [
			{ type: 'string', name: 'field1', label: 'Input with initial value', initialValue: 'Initial value' },
			{ type: 'string', name: 'field2', label: 'Masked input', mask: '*' },
			]
		},
		]
	}}
	/>
	*/
