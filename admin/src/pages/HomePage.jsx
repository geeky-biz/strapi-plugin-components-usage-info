import { useNavigate } from "react-router-dom";
import { Box, Combobox, ComboboxOption, Flex, Typography } from '@strapi/design-system';
import Loader from '../components/Loader';
import { useState, useEffect } from 'react';
import { useFetchClient } from '@strapi/admin/strapi-admin';
import { TextInput, Table, Thead, Tbody, Tr, Td, Th } from '@strapi/design-system';
import { Pencil } from '@strapi/icons';
import TooltipIconButton from '../components/TooltipIconButton';
import { Page } from '@strapi/admin/strapi-admin';
import styled from "styled-components";

const apiListComponents = '/strapi-plugin-components-usage-info/list-components';
const apiGetContainingCollections = (componentUid) => `/strapi-plugin-components-usage-info/get-containing-collections/${componentUid}`;

const Select = styled.select`
  font-size: 16px;
  width: 40vw;
`;

const HomePage = () => {
  const [allComponents, setAllComponents] = useState([]);
  const [containingCollections, setContainingCollections] = useState([]);
  const [displayComponentsFilterText, setDisplayFilterComponentsText] = useState("");
  const { get } = useFetchClient();
  const navigate = useNavigate();

  const openContentManagerView = (collectionUid, documentId, locale) => {
    navigate(`/content-manager/collection-types/${collectionUid}/${documentId}?plugins[i18n][locale]=${locale}`);
  };
  const fetchAllComponents = async () => {
    return get(apiListComponents).then((resp) => resp.data);
  };
  
  useEffect(() => {
    fetchAllComponents().then((components) => {
      setAllComponents(components);
    });
  }, []);
  const fetchContainingCollections = async (componentUid) => {
    return get(apiGetContainingCollections(componentUid))
    .then((resp) => resp.data)
    .then(setContainingCollections);
  };
  return (
    <Page.Main>
      <Page.Title>Components Usage Information</Page.Title>
      <Box padding={10}>
        <Typography tag="h1" variant="alpha">
          Components Usage Information
        </Typography>
      {
        !allComponents || allComponents.length == 0 &&  <Loader />
      }
      {
        <Box paddingTop={4} paddingBottom={4}>
          <Box width="40vw" paddingTop={4} paddingBottom={4}>
            <TextInput
              width="40vw"
              placeholder="Filter from the list of components"
              size="M"
              type="text"
              onChange={(e) => setDisplayFilterComponentsText(e.target.value)}
            />
          </Box>
          <Select name="components-list" id="components-list" size={8} onChange={(e) => fetchContainingCollections(e.target.value)}>
            {
              allComponents
              .filter((component) => component.includes(displayComponentsFilterText))
              .map((component, index) => (
                <option key={index} value={component} >
                  {component}
                </option>
              ))            
            }
          </Select>
        </Box>
      }
      {
        containingCollections.length > 0 && (
          <Box paddingTop={4} paddingBottom={4}>
            <Table>
              <Thead>
                <Tr>
                  <Th>
                    <Flex>
                      Edit
                    </Flex>
                  </Th>
                  <Th>Collection</Th>
                  <Th>Document ID</Th>
                  <Th>Locale</Th>
                </Tr>
              </Thead>
              <Tbody>
                {
                  containingCollections.map((collection, index) => (
                    <Tr key={index}>
                      <Td>
                        <TooltipIconButton onClick={() => openContentManagerView(collection.uid, collection.data.documentId, collection.data.locale)} label="Edit" noBorder>
                          <Pencil />
                        </TooltipIconButton>
                      </Td>
                      <Td><Typography size="14px">{collection.uid.split('.')[1]}</Typography></Td>
                      <Td><Typography size="14px">{collection.data.documentId}</Typography></Td>
                      <Td><Typography size="14px">{
                        collection.data.locales.map((l, idx) => {
                          const suffix = idx < collection.data.locales.length - 1 ? ", " : "";
                          return (l + suffix);
                        })}</Typography></Td>
                    </Tr>
                  ))
                }
              </Tbody>
            </Table>
          </Box>
        )
      }
      </Box>
    </Page.Main>
  );
};

export { HomePage };
