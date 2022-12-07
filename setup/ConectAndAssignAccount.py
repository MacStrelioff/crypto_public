from web3 import Web3

# to get key from environment
import os
from dotenv import load_dotenv  # https://pypi.org/project/python-dotenv/

# to load environment dictionary
load_dotenv('../.env')

# api key originally from https://dashboard.alchemy.com/
# apiKey=os.environ['ALCHEMY_KEY']  # gets key from environment, alternatively one could paste their key here
gapikey=os.environ['gapikey'] 
# alchemy_url = f"https://eth-mainnet.g.alchemy.com/v2/{apiKey}"
alchemy_url = f"https://eth-goerli.g.alchemy.com/v2/{gapikey}"

# connect to an ethereum node through Alchemyy
w3 = Web3(Web3.HTTPProvider(alchemy_url))
# check connection
print(f'connected: {w3.isConnected()}')

# get account
PRIVATE_KEY = os.environ['PRIVATE_KEY_VENTURES_OLD']
acct = w3.eth.account.from_key(PRIVATE_KEY)
print(f'address: {acct.address}')