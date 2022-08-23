
%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin, SignatureBuiltin
from starkware.starknet.common.syscalls import call_contract, get_caller_address, get_tx_info
from starkware.cairo.common.math import assert_not_zero, assert_le
from starkware.cairo.common.signature import verify_ecdsa_signature
from starkware.cairo.common.alloc import alloc
from starkware.cairo.common.bool import TRUE, FALSE
from contracts.interfaces.ierc20 import (IERC20)

####################
# STRUCTS
####################
struct Transaction:
    member contract_address : felt
    member function_selector : felt
    member calldata_len : felt
end

struct TestSignature:
    member hash : felt
    member pub : felt
    member sig_r : felt
    member sig_s : felt
end

####################
# STORAGE
####################
@storage_var
func num_owners() -> (res : felt):
end

@storage_var
func owners(index: felt)-> (owner: felt):
end

@storage_var
func owners_map(owner: felt)-> (index: felt):
end

@storage_var
func curr_tx_index() -> (res : felt):
end

@storage_var
func transactions(tx_index : felt) -> (tx : Transaction):
end

@storage_var
func transaction_calldata(tx_index : felt, calldata_index : felt) -> (value : felt):
end

@storage_var
func tx_confirms(tx_index : felt) -> (num_confirms : felt):
end

@storage_var
func tx_is_executed(tx_index : felt) -> (is_executed : felt):
end

@storage_var
func has_confirmed(tx_index : felt, owner : felt) -> (confirmed : felt):
end




####################
# INTERFACES
####################
@contract_interface
namespace IAccount:

    func is_valid_signature(hash : felt, signature_len : felt, signature : felt*):
    end
end

####################
# CONSTRUCTOR
####################
@constructor
func constructor{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    owners_len : felt, owners : felt*
):
    assert_le(3,owners_len) # checks if there are at least 3 owners. i.e 3 <= owners_len
    num_owners.write(owners_len)
    _set_owners(owners_len=owners_len, new_owners=owners)
    return ()

end


####################
# INTERNAL FUNCTIONS
####################
func _set_owners{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    owners_len: felt, new_owners: felt*
):
    if owners_len == 0:
        return ()
    end

    owners.write(index=owners_len, value=[new_owners]) # [new_owners] is a pointer to the first element of new_owners
    owners_map.write(owner=[new_owners], value=owners_len)
    _set_owners(owners_len=owners_len - 1, new_owners=new_owners + 1)

    return()
end

func _require_owner{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}():
   let (caller) = get_caller_address()
   let (index) = owners_map.read(owner=caller)

   with_attr error_message("NOT_OWNER"):
       assert_not_zero(index)
   end

   return()
end

func _spread_calldata{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    tx_index : felt, calldata_index : felt, calldata_len : felt, calldata : felt*
):
    if calldata_index == calldata_len:
        return ()
    end

    transaction_calldata.write(tx_index, calldata_index, calldata[calldata_index])

    _spread_calldata(tx_index, calldata_index + 1, calldata_len, calldata)
    return ()
end

func _pack_calldata{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    tx_index : felt, calldata_index : felt, calldata_len : felt, calldata : felt*
):
    if calldata_index == calldata_len:
        return ()
    end

    let (calldata_val) = transaction_calldata.read(tx_index, calldata_index)
    assert calldata[calldata_index] = calldata_val

    _pack_calldata(tx_index, calldata_index + 1, calldata_len, calldata)
    return ()
end


####################
# EXTERNAL FUNCTIONS
####################

@view
func num_of_owners{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (res : felt):
    let (total_owners) = num_owners.read()
    return (total_owners)
end

@view
func get_tx_index{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (res : felt):
    let (tx_index) = curr_tx_index.read()
    return (tx_index)
end

# initiates a transaction
@external
func submit_tx{
    syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr, ecdsa_ptr : SignatureBuiltin*
}(contract_address : felt, function_selector : felt, calldata_len : felt, calldata : felt*):
    alloc_locals
    _require_owner()

    let (caller) = get_caller_address()
    let (tx_info) = get_tx_info()

    IAccount.is_valid_signature(
        caller,
        tx_info.transaction_hash,
        tx_info.signature_len,
        tx_info.signature
    )

    let (tx_index) = curr_tx_index.read()
    transactions.write(tx_index, Transaction(
        contract_address,
        function_selector,
        calldata_len
    ))

    _spread_calldata(tx_index, 0, calldata_len, calldata)
    curr_tx_index.write(tx_index + 1)
    return ()
end

@external
func comfirm_tx{
    syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr, ecdsa_ptr : SignatureBuiltin*
}(tx_index : felt):
    alloc_locals
    _require_owner()

    let (tx : Transaction) = transactions.read(tx_index)
    assert_not_zero(tx.contract_address)

    let (num_confirmations) = tx_confirms.read(tx_index)
    let (executed) = tx_is_executed.read(tx_index)
    assert executed = FALSE

    let (caller) = get_caller_address()
    let (tx_info) = get_tx_info()

    IAccount.is_valid_signature(
        caller,
        tx_info.transaction_hash,
        tx_info.signature_len,
        tx_info.signature
    )

    let (confirmed) = has_confirmed.read(tx_index, caller)
    assert confirmed = FALSE

    tx_confirms.write(tx_index, num_confirmations + 1)
    has_confirmed.write(tx_index, caller, TRUE)

    return ()
end

@external
func __execute__{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    tx_index : felt
)->(return_data_len : felt, return_data : felt*):
    alloc_locals
    _require_owner()

    let (tx : Transaction) = transactions.read(tx_index)
    assert_not_zero(tx.contract_address)

    let (num_confirmations) = tx_confirms.read(tx_index)
    let (executed) = tx_is_executed.read(tx_index)
    assert executed = FALSE

    let (owners_len) = num_owners.read()
    with_attr error_message("NOT_ENOUGH_CONFIRMATIONS"):
        assert_le(owners_len - 1, num_confirmations)
    end

    tx_is_executed.write(tx_index, TRUE)
 
    # alloc()  is used to “dynamically” allocate a new memory segment . 
    # This segment can be used to store an array or a single element.
    let (calldata) = alloc()
    _pack_calldata(tx_index, 0, tx.calldata_len, calldata)
    assert calldata[tx.calldata_len] = tx_index

    let (return_data_len : felt, return_data : felt*) = call_contract(
        contract_address=tx.contract_address,
        function_selector=tx.function_selector,
        calldata_size=tx.calldata_len+1,
        calldata=calldata,
    )
    return ( return_data_len= return_data_len, return_data=return_data)
end


