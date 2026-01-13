import { useState, ChangeEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { Typography, Spin, Empty, message, Dropdown, Modal, Input } from "antd";
import {
  FolderOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { useFolders } from "./hooks/useFolders";
import Breadcrumbs from "./components/Breadcrumbs";
import styles from "./Dashboard.module.css";
import ViewFiles from "./components/ViewFiles";
import { foldersApi } from "./api/foldersApi";
import { useFoldersStore } from "./store/foldersStore";
import Search from "./components/Search";
import { useSearch } from "./hooks/useSearch";
import { FolderResponse } from "types/folder";

const { Title } = Typography;

const Dashboard = () => {
  const { folderId } = useParams<{ folderId?: string }>();
  const { folders, files, ancestors, currentFolderName, isLoading, error } =
    useFolders(folderId ?? null);
  const {
    results,
    isSearching,
    handleSearch,
    clearSearch,
    isLoading: searchLoading,
    removeFolder,
  } = useSearch();
  const triggerRefetch = useFoldersStore((state) => state.triggerRefetch);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderResponse | null>(
    null
  );
  const [newFolderName, setNewFolderName] = useState("");

  const handleDeleteFolder = async (id: string) => {
    try {
      await foldersApi.deleteFolder(id);
      message.success("Folder deleted successfully");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || "Failed to delete folder");
    }
    triggerRefetch();
    removeFolder(id);
  };

  const openEditModal = (folder: {
    id: string;
    name: string;
    parentId: string | null;
  }) => {
    setEditingFolder(folder as FolderResponse);
    setNewFolderName(folder.name);
    setIsModalOpen(true);
  };

  const handleEditConfirm = async () => {
    if (!editingFolder) return;
    try {
      await foldersApi.editFolder(
        editingFolder.id,
        newFolderName,
        editingFolder.parentId
      );
      message.success("Folder renamed successfully");
      triggerRefetch();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || "Failed to rename folder");
    }
    setIsModalOpen(false);
    setEditingFolder(null);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingFolder(null);
  };
  const handleCloneFolder = async (id: string) => {
    await foldersApi.cloneFolder(id);
    triggerRefetch();
  };
  const getFolderMenuItems = (folder: {
    id: string;
    name: string;
    parentId: string | null;
  }): MenuProps["items"] => [
    {
      key: "edit",
      label: "Edit",
      icon: <EditOutlined />,
      onClick: ({ domEvent }) => {
        domEvent.preventDefault();
        domEvent.stopPropagation();
        openEditModal(folder);
      },
    },
    {
      key: "clone",
      label: "Clone",
      icon: <CopyOutlined />,
      onClick: ({ domEvent }) => {
        domEvent.preventDefault();
        domEvent.stopPropagation();
        handleCloneFolder(folder.id);
      },
    },
    {
      key: "delete",
      label: "Delete",
      icon: <DeleteOutlined />,
      danger: true,
      onClick: ({ domEvent }) => {
        domEvent.preventDefault();
        domEvent.stopPropagation();
        handleDeleteFolder(folder.id);
      },
    },
  ];

  const displayFolders = isSearching ? results.folders : folders;
  const displayFiles = isSearching ? results.files : files;
  const currentLoading = isSearching ? searchLoading : isLoading;

  const renderContent = () => {
    if (currentLoading) {
      return (
        <div className={styles.loading}>
          <Spin size="large" />
        </div>
      );
    }

    if (!isSearching && error) {
      return <Empty description={error} />;
    }

    if (displayFolders.length === 0 && displayFiles.length === 0) {
      return (
        <Empty description={"Empty folder. Upload files or create folders!"} />
      );
    }

    return (
      <>
        {displayFolders.length > 0 && (
          <div className={styles.folderGrid}>
            {displayFolders.map((folder) => (
              <Link
                key={folder.id}
                to={`/folders/${folder.id}`}
                className={styles.folderCard}
                onClick={() => clearSearch()}
              >
                <FolderOutlined className={styles.folderIcon} />
                <span className={styles.folderName}>{folder.name}</span>
                {!isSearching && (
                  <Dropdown
                    menu={{ items: getFolderMenuItems(folder) }}
                    trigger={["click"]}
                  >
                    <EditOutlined
                      className={styles.moreIcon}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    />
                  </Dropdown>
                )}
              </Link>
            ))}
          </div>
        )}

        {displayFiles.length > 0 && (
          <>
            <Title level={5} style={{ marginTop: 24 }}>
              Files
            </Title>
            <div className={styles.fileGrid}>
              {displayFiles.map((file) => (
                <div key={file.id} className={styles.fileCard}>
                  <ViewFiles {...(file as any)} isSearching={isSearching} />
                  <span className={styles.fileName}>{file.name}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </>
    );
  };

  return (
    <div className={styles.dashboard}>
      <Breadcrumbs ancestors={ancestors} currentName={currentFolderName} />
      <div className={styles.searchContainer}>
        <Search handleSearch={handleSearch} clearSearch={clearSearch} />
      </div>
      <Title level={3}>{currentFolderName}</Title>
      {renderContent()}

      <Modal
        title="Rename folder"
        open={isModalOpen}
        onOk={handleEditConfirm}
        onCancel={handleCancel}
        okText="Save"
        cancelText="Cancel"
      >
        <Input
          value={newFolderName}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setNewFolderName(e.target.value)
          }
          placeholder="Enter new name"
        />
      </Modal>
    </div>
  );
};

export default Dashboard;
