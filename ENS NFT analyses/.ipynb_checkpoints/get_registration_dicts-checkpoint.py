

def get_registration_dicts(registration_logs,d,start_i,end_i):

    for log in registration_logs[start_i,end_i]:
        i+=1
        tx_hash = log.transactionHash
        if not tx_hash.hex() in d.keys():
            tx_receipt = w3.eth.get_transaction_receipt(tx_hash)
            register_event = ens_registrar_contract.events.NameRegistered().processReceipt(tx_receipt,errors=_utils.events.EventLogErrorFlags.Discard)

            d[register_event[0]['transactionHash'].hex()] = {
            'blockNumber':register_event[0]['blockNumber'],
            'owner': register_event[0]['args']['owner'], # not included in renew events
            'name': register_event[0]['args']['name'],
            'cost': register_event[0]['args']['cost'],
            'expires': register_event[0]['args']['expires']
            }

            save_obj(d, 'registration_logs_dict')

        if i%1000==0: print(f'{i},{len(d)} / {len(registration_logs)} (around {i/len(registration_logs)*100}% done)')



