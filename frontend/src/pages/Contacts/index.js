import React, { useState, useEffect, useReducer } from "react";
import openSocket from "socket.io-client";

import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Avatar from "@material-ui/core/Avatar";

import SearchIcon from "@material-ui/icons/Search";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";

import IconButton from "@material-ui/core/IconButton";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";

import api from "../../services/api";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import ContactModal from "../../components/ContactModal";
import ConfirmationModal from "../../components/ConfirmationModal/";

import { i18n } from "../../translate/i18n";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import MainContainer from "../../components/MainContainer";

const reducer = (state, action) => {
	if (action.type === "LOAD_CONTACTS") {
		const contacts = action.payload;
		const newContacts = [];

		contacts.forEach(contact => {
			const contactIndex = state.findIndex(c => c.id === contact.id);
			if (contactIndex !== -1) {
				state[contactIndex] = contact;
			} else {
				newContacts.push(contact);
			}
		});

		return [...state, ...newContacts];
	}

	if (action.type === "UPDATE_CONTACTS") {
		const contact = action.payload;
		const contactIndex = state.findIndex(c => c.id === contact.id);

		if (contactIndex !== -1) {
			state[contactIndex] = contact;
			return [...state];
		} else {
			return [contact, ...state];
		}
	}

	if (action.type === "DELETE_CONTACT") {
		const contactId = action.payload;

		const contactIndex = state.findIndex(c => c.id === contactId);
		if (contactIndex !== -1) {
			state.splice(contactIndex, 1);
		}
		return [...state];
	}

	if (action.type === "RESET") {
		return [];
	}
};

const useStyles = makeStyles(theme => ({
	mainPaper: {
		flex: 1,
		padding: theme.spacing(1),
		overflowY: "scroll",
		...theme.scrollbarStyles,
	},
}));

const Contacts = () => {
	const classes = useStyles();

	const [loading, setLoading] = useState(false);
	const [pageNumber, setPageNumber] = useState(1);
	const [searchParam, setSearchParam] = useState("");
	const [contacts, dispatch] = useReducer(reducer, []);
	const [selectedContactId, setSelectedContactId] = useState(null);
	const [contactModalOpen, setContactModalOpen] = useState(false);
	const [deletingContact, setDeletingContact] = useState(null);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [hasMore, setHasMore] = useState(false);

	useEffect(() => {
		dispatch({ type: "RESET" });
		setPageNumber(1);
	}, [searchParam]);

	useEffect(() => {
		setLoading(true);
		const delayDebounceFn = setTimeout(() => {
			const fetchContacts = async () => {
				try {
					const { data } = await api.get("/contacts/", {
						params: { searchParam, pageNumber },
					});
					dispatch({ type: "LOAD_CONTACTS", payload: data.contacts });
					setHasMore(data.hasMore);
					setLoading(false);
				} catch (err) {
					console.log(err);
					alert(err);
				}
			};
			fetchContacts();
		}, 500);
		return () => clearTimeout(delayDebounceFn);
	}, [searchParam, pageNumber]);

	useEffect(() => {
		const socket = openSocket(process.env.REACT_APP_BACKEND_URL);
		socket.on("contact", data => {
			if (data.action === "update" || data.action === "create") {
				dispatch({ type: "UPDATE_CONTACTS", payload: data.contact });
			}

			if (data.action === "delete") {
				dispatch({ type: "DELETE_CONTACT", payload: +data.contactId });
			}
		});

		return () => {
			socket.disconnect();
		};
	}, []);

	const handleSearch = event => {
		setSearchParam(event.target.value.toLowerCase());
	};

	const handleOpenContactModal = () => {
		setSelectedContactId(null);
		setContactModalOpen(true);
	};

	const handleCloseContactModal = () => {
		setSelectedContactId(null);
		setContactModalOpen(false);
	};

	const hadleEditContact = contactId => {
		setSelectedContactId(contactId);
		setContactModalOpen(true);
	};

	const handleDeleteContact = async contactId => {
		try {
			await api.delete(`/contacts/${contactId}`);
		} catch (err) {
			alert(err);
		}
		setDeletingContact(null);
		setSearchParam("");
		setPageNumber(1);
	};

	const handleimportContact = async () => {
		try {
			await api.post("/contacts/import");
		} catch (err) {
			console.log(err);
		}
	};

	const loadMore = () => {
		setPageNumber(prevState => prevState + 1);
	};

	const handleScroll = e => {
		if (!hasMore || loading) return;
		const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
		if (scrollHeight - (scrollTop + 100) < clientHeight) {
			loadMore();
		}
	};

	return (
		<MainContainer className={classes.mainContainer}>
			<ContactModal
				open={contactModalOpen}
				onClose={handleCloseContactModal}
				aria-labelledby="form-dialog-title"
				contactId={selectedContactId}
			></ContactModal>
			<ConfirmationModal
				title={
					deletingContact
						? `${i18n.t("contacts.confirmationModal.deleteTitle")} ${
								deletingContact.name
						  }?`
						: `${i18n.t("contacts.confirmationModal.importTitlte")}`
				}
				open={confirmOpen}
				setOpen={setConfirmOpen}
				onConfirm={e =>
					deletingContact
						? handleDeleteContact(deletingContact.id)
						: handleimportContact()
				}
			>
				{deletingContact
					? `${i18n.t("contacts.confirmationModal.deleteMessage")}`
					: `${i18n.t("contacts.confirmationModal.importMessage")}`}
			</ConfirmationModal>
			<MainHeader>
				<Title>{i18n.t("contacts.title")}</Title>
				<MainHeaderButtonsWrapper>
					<TextField
						placeholder={i18n.t("contacts.searchPlaceholder")}
						type="search"
						value={searchParam}
						onChange={handleSearch}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<SearchIcon style={{ color: "gray" }} />
								</InputAdornment>
							),
						}}
					/>
					<Button
						variant="contained"
						color="primary"
						onClick={e => setConfirmOpen(true)}
					>
						{i18n.t("contacts.buttons.import")}
					</Button>
					<Button
						variant="contained"
						color="primary"
						onClick={handleOpenContactModal}
					>
						{i18n.t("contacts.buttons.add")}
					</Button>
				</MainHeaderButtonsWrapper>
			</MainHeader>
			<Paper
				className={classes.mainPaper}
				variant="outlined"
				onScroll={handleScroll}
			>
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell padding="checkbox" />
							<TableCell>{i18n.t("contacts.table.name")}</TableCell>
							<TableCell>{i18n.t("contacts.table.whatsapp")}</TableCell>
							<TableCell>{i18n.t("contacts.table.email")}</TableCell>
							<TableCell align="right">
								{i18n.t("contacts.table.actions")}
							</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						<>
							{contacts.map(contact => (
								<TableRow key={contact.id}>
									<TableCell style={{ paddingRight: 0 }}>
										{<Avatar src={contact.profilePicUrl} />}
									</TableCell>
									<TableCell>{contact.name}</TableCell>
									<TableCell>{contact.number}</TableCell>
									<TableCell>{contact.email}</TableCell>
									<TableCell align="right">
										<IconButton
											size="small"
											onClick={() => hadleEditContact(contact.id)}
										>
											<EditIcon />
										</IconButton>

										<IconButton
											size="small"
											onClick={e => {
												setConfirmOpen(true);
												setDeletingContact(contact);
											}}
										>
											<DeleteOutlineIcon />
										</IconButton>
									</TableCell>
								</TableRow>
							))}
							{loading && <TableRowSkeleton />}
						</>
					</TableBody>
				</Table>
			</Paper>
		</MainContainer>
	);
};

export default Contacts;
