import * as React from 'react';
import styled from 'styled-components';

import Web3Modal from 'web3modal';
// @ts-ignore
import WalletConnectProvider from '@walletconnect/web3-provider';
import Column from './components/Column';
import Wrapper from './components/Wrapper';
import Header from './components/Header';
import Loader from './components/Loader';
import ConnectButton from './components/ConnectButton';
import ProductsList from './components/ProductsList';

import { Web3Provider } from '@ethersproject/providers';
import { getChainData } from './helpers/utilities';
// import { ethers } from 'ethers';
import { STORE_CONTRACT  } from './constants';
import { getContract } from './helpers/ethers';

const SLayout = styled.div`
  position: relative;
  width: 100%;
  min-height: 100vh;
  text-align: center;
`;

const SContent = styled(Wrapper)`
  width: 100%;
  height: 100%;
  padding: 0 16px;
`;

const SContainer = styled.div`
  height: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  word-break: break-word;
`;

const SLanding = styled(Column)`
  height: 600px;
`;

// @ts-ignore
const SBalances = styled(SLanding)`
  height: 100%;
  & h3 {
    padding-top: 30px;
  }
`;

const SError = styled.div`
  height: 100%;
  width: 100%;
  min-height: 50px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  word-break: break-word;
  border-radius: 3px;
  background: #ff5566;
`;

interface IAppState {
  fetching: boolean;
  address: string;
  library: any;
  connected: boolean;
  chainId: number;
  pendingRequest: boolean;
  result: any | null;
  electionContract: any | null;
  info: any | null;
  errorMessage: string | null,
  storeContract: any | null;
  productIds: number | null;
}

const INITIAL_STATE: IAppState = {
  fetching: false,
  address: '',
  library: null,
  connected: false,
  chainId: 1,
  pendingRequest: false,
  result: null,
  electionContract: null,
  info: null,
  errorMessage: null,
  storeContract: null,
  productIds: null,
};

class App extends React.Component<any, any> {
  // @ts-ignore
  public web3Modal: Web3Modal;
  public state: IAppState;
  public provider: any;

  constructor(props: any) {
    super(props);
    this.state = {
      ...INITIAL_STATE
    };

    this.web3Modal = new Web3Modal({
      network: this.getNetwork(),
      cacheProvider: true,
      providerOptions: this.getProviderOptions()
    });
  }

  public componentDidMount() {
    if (this.web3Modal.cachedProvider) {
      this.onConnect();
    }
  }

  public onConnect = async () => {
    this.provider = await this.web3Modal.connect();

    const library = new Web3Provider(this.provider);

    const network = await library.getNetwork();

    const address = this.provider.selectedAddress ? this.provider.selectedAddress : this.provider.accounts[0];

    const storeContract = getContract(STORE_CONTRACT.address, STORE_CONTRACT.json.abi, library, address);

    // const signer = this.state.library.getSigner();
    // const hashedMessage = ethers.utils.solidityKeccak256(["string"], ["Hello"]);
    // const messageBytes = ethers.utils.arrayify(hashedMessage);
    // const signedMessage = await signer.signMessage(messageBytes);

    // building transaction
    // const iface = new ethers.utils.Interface(STORE_CONTRACT.json.abi);
    // const encodedData = iface.encodeFunctionData("addProduct", [444, 2, 5]);
    // const signer = library.getSigner();
    // const tx = { to: STORE_CONTRACT.address, data: encodedData };
    // await signer.sendTransaction(tx);
    // await this.setState({ errorMessage: encodedData });

    await this.setState({
      library,
      chainId: network.chainId,
      address,
      connected: true,
      storeContract
    });

    await this.subscribeToProviderEvents(this.provider);

    await this.showAvailableProducts();
  };

  public subscribeToProviderEvents = async (provider:any) => {
    if (!provider.on) {
      return;
    }

    provider.on("accountsChanged", this.changedAccount);
    provider.on("networkChanged", this.networkChanged);
    provider.on("close", this.close);

    await this.web3Modal.off('accountsChanged');
  };

  public async unSubscribe(provider:any) {
    // Workaround for metamask widget > 9.0.3 (provider.off is undefined);
    window.location.reload(false);
    if (!provider.off) {
      return;
    }

    provider.off("accountsChanged", this.changedAccount);
    provider.off("networkChanged", this.networkChanged);
    provider.off("close", this.close);
  }

  public changedAccount = async (accounts: string[]) => {
    if(!accounts.length) {
      // Metamask Lock fire an empty accounts array 
      await this.resetApp();
    } else {
      await this.setState({ address: accounts[0] });
    }
  }

  public networkChanged = async (networkId: number) => {
    const library = new Web3Provider(this.provider);
    const network = await library.getNetwork();
    const chainId = network.chainId;
    await this.setState({ chainId, library });
  }
  
  public close = async () => {
    this.resetApp();
  }

  public getNetwork = () => getChainData(this.state.chainId).network;

  public getProviderOptions = () => {
    const providerOptions = {
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          infuraId: process.env.REACT_APP_INFURA_ID
        }
      }
    };
    return providerOptions;
  };

  public resetApp = async () => {
    await this.web3Modal.clearCachedProvider();
    localStorage.removeItem("WEB3_CONNECT_CACHED_PROVIDER");
    localStorage.removeItem("walletconnect");
    await this.unSubscribe(this.provider);

    this.setState({ ...INITIAL_STATE });
  };

  public showAvailableProducts = async () => {
    this.setState({ fetching: true });

    try {
      const productIds = await this.state.storeContract.getAvailableProducts();
      await this.setState({ productIds });
    } catch (err) {
      await this.setState({ errorMessage: err.errorArgs[0] });
    }

    await this.setState({ fetching: false });
  }

  public render = () => {
    const {
      address,
      connected,
      chainId,
      fetching
    } = this.state;
    return (
      <SLayout>
        <Column maxWidth={1000} spanHeight>
          {this.state.errorMessage ? <SError>{this.state.errorMessage}</SError> : ""}

          <Header
            connected={connected}
            address={address}
            chainId={chainId}
            killSession={this.resetApp}
          />

          <SContent>
            {fetching ? (
              <Column center>
                <SContainer>
                  <Loader />
                </SContainer>
              </Column>
            ) : (
                <SLanding center>
                  {!this.state.connected && <ConnectButton onClick={this.onConnect} />}
                  {this.state.connected && !this.state.errorMessage && <ProductsList productIds={this.state.productIds} /> }
                </SLanding>
              )}
          </SContent>
        </Column>
      </SLayout>
    );
  };
}

export default App;
